import fs from 'node:fs'
import sinon from 'sinon'
import { assert } from 'chai'
import * as chai from 'chai'
import asPromised from 'chai-as-promised'
import hb from 'handlebars'
import { createMockFs } from '../mocks'
import { Config, LogFormat, LogLevelNames } from '../../src'
import { create } from '../../src/services'

chai.use(asPromised)

const CONFIG_FILE = './config.unit-test.mjs'

const _setup = () => {
  const log = {
    info: sinon.stub(),
    warn: sinon.stub(),
    trace: sinon.stub(),
    debug: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
  }
  return {
    log,
    fs: createMockFs(),
    environment: 'unit-test',
    workingDirectory: '../../',
  }
}

const _writeUnitTestConfig = (config: Config) => {
  const configTemplate = fs.readFileSync(
    //'../templates/config.mjs.handlebars',
    './test/templates/config.mjs.handlebars',
    'utf8'
  )
  const template = hb.compile(configTemplate)
  const data = {
    content: new hb.SafeString(JSON.stringify(config, null, 2)),
  }
  const text = template(data)
  fs.writeFileSync(CONFIG_FILE, text)
}

const _deleteUnitTestConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.rmSync(CONFIG_FILE)
  }
}

const _validConfig1 = () => ({
  environment: 'unit-test',
  '@nil/core': {
    apps: [
      {
        name: 'test',
      },
    ],
    layerOrder: ['services', 'features'],
    logFormat: LogFormat.full,
    logLevel: LogLevelNames.silent,
  },
})

const _validConfig2 = () => ({
  environment: 'unit-test',
  '@nil/core': {
    apps: [
      {
        name: 'fakeapp',
        services: {
          create: () => ({}),
        },
        features: {
          create: () => ({}),
        }
      },
      {
        name: 'fakeapp2',
        services: {
          create: () => ({}),
        },
      },
    ],
    layerOrder: ['services', 'features'],
    logFormat: LogFormat.full,
    logLevel: LogLevelNames.silent,
  },
})

const _validConfig3 = () => ({
  environment: 'unit-test',
  '@nil/core': {
    apps: [
      {
        name: 'fakeapp',
        services: {
          create: () => ({}),
        },
        features: {
          create: () => undefined,
        }
      }
    ],
    layerOrder: ['services', 'features'],
    logFormat: LogFormat.full,
    logLevel: LogLevelNames.silent,
  },
})

describe('/src/services.ts', () => {
  describe('#create()', () => {
    describe('#loadApp()', () => {})
    describe('#loadConfig()', () => {
      before(async () => {
        _deleteUnitTestConfig()
      })
      it('should load a config at config.unittest.mjs', async () => {
        _writeUnitTestConfig(_validConfig1())
        const inputs = _setup()
        const instance = create(inputs)
        const actual = await instance.loadConfig()
        const expected = _validConfig1()
        assert.deepEqual(actual, expected)
      })
    })
    describe('#loadLayer()', () => {})
    describe('#loadLayers()', () => {
      it('should load services for fakeapp', async () => {
        const inputs = _setup()
        const instance = create(inputs)
        const actual = await instance.loadLayers({config: _validConfig2(), log: inputs.log})
        assert.isOk(actual.services['fakeapp'])
      })
      it('should load features for fakeapp', async () => {
        const inputs = _setup()
        const instance = create(inputs)
        const actual = await instance.loadLayers({config: _validConfig2(), log: inputs.log})
        assert.isOk(actual.features['fakeapp'])
      })
      it('should NOT load features for fakeapp2', async () => {
        const inputs = _setup()
        const instance = create(inputs)
        const actual = await instance.loadLayers({config: _validConfig2(), log: inputs.log})
        assert.isUndefined(actual.features['fakeapp2'])
      })
      it('should throw an exception when there is an app that has a services object but create produced nothing', async () => {
        const inputs = _setup()
        const instance = create(inputs)
        assert.throws(() => {
          instance.loadLayers({config: _validConfig3(), log: inputs.log})
        })
      })
    })
    describe('#configureLogging()', () => {})
  })
})
