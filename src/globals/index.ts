import nodeFS from 'node:fs'
import nodePath from 'node:path'
import merge from 'lodash/merge.js'
import get from 'lodash/get.js'
import { isConfig, validateConfig } from '../libs.js'
import {
  Config,
  RootLogger,
  App,
  CommonContext,
  CoreNamespace,
  NodeDependencies,
} from '../types.js'
import { memoizeValue } from '../utils.js'
import { standardLogger } from './logging.js'

const name = CoreNamespace.globals

type GlobalsServicesProps = Readonly<{
  environment: string
  workingDirectory: string
  nodeOverrides?: Partial<NodeDependencies>
}>

type GlobalsServices<TConfig extends Config> = Readonly<{
  loadConfig: () => Promise<TConfig>
  getRootLogger: () => RootLogger
  getConstants: () => {
    workingDirectory: string
    environment: string
  }
  getNodeServices: () => NodeDependencies
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
    nodeOverrides,
  }: GlobalsServicesProps): GlobalsServices<TConfig> => {
    const getRootLogger = standardLogger

    const _findConfigPath = () => {
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
      const fullPath = _findConfigPath()
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

    const getNodeServices = () => {
      return merge(
        {
          fs: nodeFS,
        },
        nodeOverrides || {}
      )
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
      getNodeServices,
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
        node: ourServices.getNodeServices(),
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
