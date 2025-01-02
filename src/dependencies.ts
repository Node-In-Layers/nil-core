import nodeFS from 'node:fs'
import nodePath from 'node:path'
import merge from 'lodash/merge.js'
import get from 'lodash/get.js'
import log from 'loglevel'
import { getLogLevelName, isConfig, validateConfig } from './libs.js'
import {
  Config,
  LogFormat,
  DependenciesServices,
  DependenciesServicesProps,
  DependenciesFeatures,
  App,
  CommonDependencies,
  CoreNamespace,
} from './types.js'
import { memoizeValue } from './utils.js'

const name = CoreNamespace.dependencies

const services = {
  create: <TConfig extends Config>({
    environment,
    workingDirectory,
  }: DependenciesServicesProps): DependenciesServices<TConfig> => {
    const useFullLogFormat = () => {
      const originalFactory = log.methodFactory
      // eslint-disable-next-line functional/immutable-data
      log.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName)
        return function (message) {
          const datetime = new Date().toISOString()
          rawMethod(
            `${datetime} ${getLogLevelName(logLevel)} [${String(loggerName)}] ${message}`
          )
        }
      }
      log.rebuild()
    }

    const useJsonLogFormat = () => {
      const originalFactory = log.methodFactory
      // eslint-disable-next-line functional/immutable-data
      log.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName)
        return function (message) {
          const datetime = new Date().toISOString()
          rawMethod(
            JSON.stringify(
              {
                datetime,
                message,
                loggerName:
                  loggerName === undefined ? undefined : String(loggerName),
                logLevel: getLogLevelName(logLevel),
              },
              null
            )
          )
        }
      }
      log.rebuild()
    }

    const useSimpleLogFormat = () => {
      const originalFactory = log.methodFactory
      // eslint-disable-next-line functional/immutable-data
      log.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName)
        return function (message) {
          const datetime = new Date().toISOString()
          rawMethod(`${datetime}: ${message}`)
        }
      }
      log.rebuild()
    }

    const configureLogging = (config: Config) => {
      log.setLevel(config[CoreNamespace.root].logLevel)
      switch (config[CoreNamespace.root].logFormat) {
        case LogFormat.json:
          useJsonLogFormat()
          break
        case LogFormat.simple:
          useSimpleLogFormat()
          break
        case LogFormat.full:
          useFullLogFormat()
          break
        default:
          throw new Error(
            `LogFormat ${config[CoreNamespace.root].logFormat} is not supported`
          )
      }
      return log
    }

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

    const _loadConfig = memoizeValue<Config>(async () => {
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
      return {
        fs: nodeFS,
      }
    }

    const getDependencies = (
      commonDependencies: CommonDependencies<TConfig>,
      app: App
    ) => {
      if (app.dependencies) {
        return app.dependencies.create(commonDependencies)
      }
      return Promise.resolve({})
    }

    return {
      loadConfig,
      getConstants,
      configureLogging,
      getNodeServices,
      getDependencies,
    }
  },
}

const features = {
  create: <TConfig extends Config>({
    services,
  }: {
    services: {
      [CoreNamespace.dependencies]: DependenciesServices<TConfig>
    }
  }): DependenciesFeatures<TConfig> => {
    const ourServices = get(services, name)

    const loadDependencies = async <TDependencies extends object>(
      environmentOrConfig: string | TConfig
    ) => {
      const config: TConfig = await (isConfig(environmentOrConfig)
        ? environmentOrConfig
        : ourServices.loadConfig())
      validateConfig(config)

      const commonDependencies = {
        config,
        log: ourServices.configureLogging(config),
        node: ourServices.getNodeServices(),
        constants: ourServices.getConstants(),
      }
      const dependencies: TDependencies = await config[
        CoreNamespace.root
      ].apps.reduce(
        async (accP, app) => {
          const acc = await accP
          const dep = await ourServices.getDependencies(commonDependencies, app)
          return merge(acc, dep)
        },
        Promise.resolve({} as TDependencies)
      )
      return merge(commonDependencies, dependencies)
    }
    return {
      loadDependencies,
    }
  },
}

export { services, features, name }
