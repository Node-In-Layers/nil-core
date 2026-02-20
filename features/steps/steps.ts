import {
  Before,
  After,
  Given,
  When,
  Then,
  setWorldConstructor,
} from '@cucumber/cucumber'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import assert from 'node:assert'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { CoreNamespace, LogFormat, LogLevelNames } from '../../src/types.js'
import { loadSystem } from '../../src/entries.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '..', 'data')
const collectorDir = path.join(dataDir, 'collector')
const collectorLogPath = path.join(collectorDir, 'features-otel.json')

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const execFileAsync = promisify(execFile)

const composeCwd = path.resolve(__dirname, '..', '..')
const composeArgs = (args: readonly string[]) => [
  'compose',
  '-f',
  'docker-compose-features.yml',
  ...args,
]

// Reusable helpers to manage the OTEL collector via docker compose at scenario level.
const runDockerCompose = (args: readonly string[]) =>
  execFileAsync('docker', composeArgs(args), { cwd: composeCwd }).then(
    () => undefined
  )

const startCollector = () =>
  runDockerCompose(['up', '-d']).then(async () => {
    await sleep(5000)
  })
const stopCollector = () => runDockerCompose(['down'])

// Capture container stdout/stderr (including shutdown messages) before tearing down.
const getCollectorLogs = (): Promise<string> =>
  execFileAsync(
    'docker',
    composeArgs([
      'logs',
      '--no-color',
      'node-in-layers-core-features-otel-collector',
    ]),
    {
      cwd: composeCwd,
      maxBuffer: 1024 * 1024,
    }
  )
    .then(({ stdout, stderr }) =>
      [stdout, stderr].filter(Boolean).join('\n').trim()
    )
    .catch(() => '')

// Read the collector file, handling truncation/null bytes and retrying until it has content.
const readCollectorFile = async (maxAttempts = 10): Promise<string> => {
  const attemptRead = async (remaining: number): Promise<string> => {
    if (remaining <= 0) {
      return ''
    }

    try {
      const rawContent = await fs.readFile(collectorLogPath, 'utf8')
      // Strip any null bytes that may exist due to truncation while the collector holds the file open.
      const cleaned = rawContent.replace(/\0/g, '')
      if (cleaned && cleaned.length > 0) {
        return cleaned
      }
    } catch {
      // file may not exist yet; ignore and retry
    }

    await sleep(100)
    return attemptRead(remaining - 1)
  }

  return attemptRead(maxAttempts)
}

const createDomain1 = () => ({
  name: 'domain1',
  services: {
    create: () => ({
      ping: x => {
        console.log('INSIDE PING')
        console.log(JSON.stringify(x, null, 2))
        return 'pong'
      },
    }),
  },
  features: {
    create: context => ({
      callPing: (crossLayerProps: any) =>
        context.services.domain1.ping(crossLayerProps),
    }),
  },
})

// Test-only config factories keyed by name so step text can choose which to use.
const CONFIGS = {
  otel: () => ({
    systemName: 'nil-core-features',
    environment: 'cucumber-test',
    [CoreNamespace.root]: {
      apps: [createDomain1()],
      layerOrder: ['services', 'features', 'entries'],
      logging: {
        logLevel: LogLevelNames.info,
        logFormat: [LogFormat.otel],
        otel: {
          serviceName: 'nil-core-features',
          version: '1.0.0',
          trace: { enabled: true },
          logs: { enabled: true },
          metrics: { enabled: true },
        },
      },
    },
  }),
} as const

class TestWorld {
  system: any | undefined
  configKey: keyof typeof CONFIGS | undefined
  sdk: NodeSDK | undefined
}

setWorldConstructor(TestWorld)

Before({ timeout: 10_000 }, async function () {
  // Ensure test/collector directories exist.
  await fs.mkdir(collectorDir, { recursive: true })
  //await fs.rm(collectorLogPath, { force: true })

  // Ensure any previous collector instance is stopped, then start a fresh one.
  await stopCollector().catch(() => undefined)
  await startCollector()

  // Start a fresh NodeSDK for this scenario that exports traces to the local collector.
  this.sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    }),
  })
  await this.sdk.start()
})

After(async function () {
  // Shut down the per-scenario SDK.
  if (this.sdk) {
    await this.sdk.shutdown()
    this.sdk = undefined
  }
  //await fs.rm(collectorLogPath, { force: true })

  // Capture and print container output (including shutdown messages).
  const logs = await getCollectorLogs()
  if (logs) {
    console.log('\n--- Collector logs (this scenario) ---\n' + logs + '\n---\n')
  }

  // Tear down the collector for this scenario.
  await stopCollector()
})

Given('I use the {string} config', function (key: string) {
  if (!(key in CONFIGS)) {
    throw new Error(
      `Unknown config key "${key}". Known keys: ${Object.keys(CONFIGS).join(', ')}`
    )
  }
  this.configKey = key as keyof typeof CONFIGS
})

Given('I load the system', async function () {
  const key = this.configKey ?? ('otel' as keyof typeof CONFIGS)
  const createConfig = CONFIGS[key]
  // @ts-ignore - test-only config; structural typing is enough here
  this.system = await loadSystem({
    environment: 'cucumber-test',
    config: createConfig(),
  })
})

When('I call domain1 callPing', async function () {
  const result = await this.system.features.domain1.callPing()
  assert.strictEqual(result, 'pong')
})

When(
  'I call domain1 callPing with feature ids {string} and {string}',
  async function (outerId: string, innerId: string) {
    const crossLayerProps = {
      logging: {
        ids: [{ featureId: outerId }, { featureId: innerId }],
      },
    }
    const result = await this.system.features.domain1.callPing(crossLayerProps)
    assert.strictEqual(result, 'pong')
  }
)

Then(
  'I should see telemetry in the collector',
  { timeout: 10_000 },
  async function () {
    // Shut down this scenario's SDK so any in-process spans/logs are flushed to the collector.
    if (this.sdk) {
      await this.sdk.shutdown()
      this.sdk = undefined
    }

    // Collector batch processor has timeout 1s; give it time to flush to file exporter.
    await sleep(2000)
    const content = await readCollectorFile()

    assert.ok(
      content && content.length > 0,
      'expected collector log file to contain telemetry, but it was empty or missing after waiting'
    )
  }
)

Then(
  'the collector logs should contain two featureId attributes',
  { timeout: 10_000 },
  async function () {
    // Shut down this scenario's SDK so any in-process spans/logs are flushed to the collector.
    if (this.sdk) {
      await this.sdk.shutdown()
      this.sdk = undefined
    }

    // Re-use the same wait/poll logic to ensure the collector has flushed logs.
    await sleep(2000)
    const content = await readCollectorFile()

    assert.ok(
      content && content.length > 0,
      'expected collector log file to contain telemetry, but it was empty or missing after waiting'
    )

    // File is JSON Lines (one OTLP payload per line). Find the logs payload.
    const lines = content
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    const logsLine = lines.find(line => line.includes('"resourceLogs"'))
    assert.ok(logsLine, 'expected a resourceLogs payload in the collector file')

    const logsPayload = JSON.parse(logsLine)
    const resourceLogs = logsPayload.resourceLogs ?? []

    const featureIdCount = (resourceLogs as any[])
      .flatMap(rl => (rl?.scopeLogs ?? []) as any[])
      .flatMap(sl => (sl?.logRecords ?? []) as any[])
      .flatMap(lr => (lr?.attributes ?? []) as any[])
      .filter((attr: any) => attr?.key === 'featureId').length

    assert.strictEqual(
      featureIdCount,
      2,
      `expected exactly two featureId attributes in collector logs, but found ${featureIdCount}`
    )
  }
)
