import merge from 'lodash/merge.js'
import { v4 } from 'uuid'
import get from 'lodash/get.js'
import { isConfig, validateConfig } from '../libs.js'
import {
  Config,
  RootLogger,
  App,
  CommonContext,
  CoreNamespace,
  FeaturesContext,
} from '../types.js'
import { memoizeValue } from '../utils.js'
import { standardLogger } from './logging.js'

const name = CoreNamespace.globals

type GlobalsServicesProps = Readonly<{
  environment: string
  workingDirectory: string
  runtimeId?: string
}>

type GlobalsServices<TConfig extends Config> = Readonly<{
  loadConfig: () => Promise<TConfig>
  getRootLogger: () => RootLogger
  getConstants: () => {
    runtimeId: string
    workingDirectory: string
    environment: string
  }
  getGlobals: (
    commonGlobals: CommonContext<TConfig>,
    app: App
  ) => Promise<Record<string, any>>
}>

type GlobalsFeatures<TConfig extends Config> = Readonly<{
  loadGlobals: <TGlobals extends Record<string, any> = object>(
    environmentOrConfig: string | TConfig
  ) => Promise<CommonContext<TConfig> & TGlobals>
}>

type GlobalServicesLayer = Readonly<{
  services: {
    [CoreNamespace.globals]: GlobalsServices<Config>
  }
}>

const services = {
  create: <TConfig extends Config>({
    environment,
    workingDirectory,
    runtimeId,
  }: GlobalsServicesProps): GlobalsServices<TConfig> => {
    const getRootLogger = standardLogger

    const _findConfigPath = async () => {
      const nodeFS = await import('node:fs')
      const nodePath = await import('node:path')
      const extensions = ['mjs', 'js', 'mts', 'ts']
      return extensions
        .map(e => {
          return nodePath.resolve(
            `${workingDirectory}/config.${environment}.${e}`
          )
        })
        .find(filePath => {
          return nodeFS.existsSync(filePath)
        })
    }

    const _loadConfig = memoizeValue(async () => {
      process.chdir(workingDirectory)
      const fullPath = await _findConfigPath()
      if (!fullPath) {
        throw new Error(
          `Could not find a config.${environment} for mts, ts, mjs, or js.`
        )
      }
      const url = new URL(`file://${fullPath}`)
      // @ts-ignore
      const module = await import(url)
      const func = module.default ? module.default : module
      const config: Config = await func()
      validateConfig(config)
      return config
    })

    const loadConfig = <TConfig extends Config>() =>
      _loadConfig() as Promise<TConfig>

    const getConstants = () => {
      return {
        runtimeId: runtimeId || v4(),
        workingDirectory,
        environment,
      }
    }

    const getGlobals = (commonGlobals: CommonContext<TConfig>, app: App) => {
      if (app.globals) {
        return app.globals.create(commonGlobals)
      }
      return Promise.resolve({})
    }

    return {
      loadConfig,
      getConstants,
      getRootLogger,
      getGlobals,
    }
  },
}

const features = {
  create: <TConfig extends Config>(
    context: FeaturesContext<TConfig, GlobalServicesLayer>
  ): GlobalsFeatures<TConfig> => {
    const ourServices = get(context.services, name) as
      | GlobalsServices<TConfig>
      | undefined
    if (!ourServices) {
      throw new Error(`Services for ${name} not found`)
    }

    const loadGlobals = async <TGlobals extends object>(
      environmentOrConfig: string | TConfig
    ) => {
      const config: TConfig = await (isConfig(environmentOrConfig)
        ? environmentOrConfig
        : ourServices.loadConfig())
      validateConfig(config)

      const commonGlobals = {
        config,
        rootLogger: ourServices.getRootLogger(),
        constants: ourServices.getConstants(),
      }
      const globals: TGlobals = await config[CoreNamespace.root].apps.reduce(
        async (accP, app) => {
          const acc = await accP
          const dep = await ourServices.getGlobals(commonGlobals, app)
          return merge(acc, dep)
        },
        Promise.resolve({} as TGlobals)
      )
      return merge(commonGlobals, globals)
    }
    return {
      loadGlobals,
    }
  },
}

export { services, features, name }
