import * as path from 'node:path'
import parentModule from 'parent-module'
import { resolve } from 'import-meta-resolve'
import merge from 'lodash/merge.js'
import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import log from 'loglevel'
import {
  Config,
  CoreServices,
  CoreServicesProps,
  LayerDependencies,
  LogFormat,
  App,
  AppLayer,
} from './types.js'
import {
  getLayersUnavailable,
  getLogLevelName,
  validateConfig,
  lazyValue,
} from './libs.js'

const create = ({
  fs,
  environment,
  workingDirectory,
}: CoreServicesProps): CoreServices => {
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
    log.setLevel(config['@nil/core'].logLevel)
    switch (config['@nil/core'].logFormat) {
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
          `LogFormat ${config['@nil/core'].logFormat} is not supported`
        )
    }
    return log
  }

  const _loadConfig = lazyValue<Config>(async () => {
    process.chdir(workingDirectory)
    // TODO: this needs to be improved.
    const filePath = `../config.${environment}.mjs`
    const module = await import(filePath)
    const func = module.default ? module.default : module
    const config: Config = await func()
    validateConfig(config)
    return config
  })

  const loadConfig = <TConfig extends Config>() =>
    _loadConfig() as Promise<TConfig>

  const loadLayer = (app: App, layer: string, existingLayers: object) => {
    const constructor: AppLayer<any, any> | undefined = get(app, `${layer}`)
    if (!constructor?.create) {
      return undefined
    }
    const instance = constructor.create(existingLayers)
    if (!instance) {
      throw new Error(
        `App ${app.name} did not return an instance layer ${layer}`
      )
    }
    return instance
  }

  const loadLayers = ({ config, log }) => {
    const startingDependencies: LayerDependencies = {
      log,
      config,
      fs,
      constants: {
        workingDirectory,
        environment,
      },
    }
    const layersInOrder = config['@nil/core'].layerOrder
    const antiLayers = getLayersUnavailable(layersInOrder)
    return config['@nil/core'].apps.reduce(
      (existingLayers: LayerDependencies, app) => {
        return layersInOrder.reduce(
          (existingLayers2: LayerDependencies, layer) => {
            // We have to remove existing layers that we don't want to be exposed.
            const correctContext = omit(existingLayers, antiLayers(layer))
            const instance = loadLayer(app, layer, correctContext)
            if (!instance) {
              return existingLayers2
            }
            // NOTE: This kind of merge, is not immutable, but it's fast.
            return merge(existingLayers2, {
              [layer]: {
                [app.name]: instance,
              },
            })
          },
          existingLayers
        )
      },
      startingDependencies
    )
  }

  async function loadApp(pluginName) {
    // Find the path of the parent. (The file calling this function)
    const parentModulePath = parentModule()

    if (parentModulePath === undefined) {
      throw new Error('NO_PLUGIN_FOUND')
    }

    // Find the entry point of the plugin resolved for the parent module.
    const pluginUrl = await resolve(pluginName, parentModulePath)

    const plugin = await import(pluginUrl)
    return plugin.default
  }

  return {
    loadApp,
    loadConfig,
    loadLayer,
    loadLayers,
    configureLogging,
  }
}

export { create }
