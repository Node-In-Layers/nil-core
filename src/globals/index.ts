import merge from 'lodash/merge.js'
import get from 'lodash/get.js'
import { isConfig, validateConfig } from '../libs.js'
import {
  Config,
  RootLogger,
  App,
  CommonContext,
  CoreNamespace,
} from '../types.js'
import { memoizeValue } from '../utils.js'
import { standardLogger } from './logging.js'

const name = CoreNamespace.globals

type GlobalsServicesProps = Readonly<{
  environment: string
  workingDirectory: string
}>

type GlobalsServices<TConfig extends Config> = Readonly<{
  loadConfig: () => Promise<TConfig>
  getRootLogger: () => RootLogger
  getConstants: () => {
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

const services = {
  create: <TConfig extends Config>({
    environment,
    workingDirectory,
  }: GlobalsServicesProps): GlobalsServices<TConfig> => {
    const getRootLogger = standardLogger

    const _findConfigPath = async () => {
      const nodeFS = await import('node:fs')
      const nodePath = await import('node:path')
      const extensions = ['mjs', 'js']
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
          `Could not find a config.${environment} for mjs, or js.`
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
  create: <TConfig extends Config>({
    services,
  }: {
    services: {
      [CoreNamespace.globals]: GlobalsServices<TConfig>
    }
  }): GlobalsFeatures<TConfig> => {
    const ourServices = get(services, name)

    const loadGlobals = async <TGlobals extends object>(
      environmentOrConfig: string | TConfig
    ) => {
      const config: TConfig = await (isConfig(environmentOrConfig)
        ? environmentOrConfig
        : ourServices.loadConfig())
      validateConfig(config)

      const commonGlobals = {
        config,
        log: ourServices.getRootLogger(),
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
