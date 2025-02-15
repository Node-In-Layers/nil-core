import get from 'lodash/get.js'
import merge from 'lodash/merge.js'
import log from 'loglevel'
import { PrimaryKeyType, ModelInstanceFetcher } from 'functional-models'
import { wrap } from './utils.js'
import { Config, LogLevel, CoreNamespace, LayerDescription } from './types.js'

const featurePassThrough = wrap

const configHasKey = (key: string) => (config: Partial<Config>) => {
  if (get(config, key) === undefined) {
    throw new Error(`${key} was not found in config`)
  }
}

const configItemIsArray = (key: string) => (config: Partial<Config>) => {
  if (Array.isArray(get(config, key)) === false) {
    throw new Error(`${key} must be an array`)
  }
}

const configItemIsType =
  (key: string, type: string) => (config: Partial<Config>) => {
    const theType = typeof get(config, key)
    if (theType !== type) {
      throw new Error(`${key} must be of type ${type}`)
    }
  }

const allAppsHaveAName = (config: Partial<Config>): boolean => {
  config[CoreNamespace.root]?.apps.find(app => {
    if (app.name === undefined) {
      throw new Error(`A configured app does not have a name.`)
    }
    return false
  })
  return true
}

const _getNamespaceProperty = (namespace: CoreNamespace, property: string) => {
  return `${namespace}.${property}`
}

const _configItemsToCheck: readonly ((config: Partial<Config>) => void)[] = [
  configHasKey('environment'),
  configHasKey('systemName'),
  configHasKey(_getNamespaceProperty(CoreNamespace.root, 'apps')),
  configItemIsArray(_getNamespaceProperty(CoreNamespace.root, 'apps')),
  configHasKey(_getNamespaceProperty(CoreNamespace.root, 'layerOrder')),
  configItemIsArray(_getNamespaceProperty(CoreNamespace.root, 'layerOrder')),
  allAppsHaveAName,
  configItemIsType(
    _getNamespaceProperty(CoreNamespace.root, 'logLevel'),
    'string'
  ),
  configItemIsType(
    _getNamespaceProperty(CoreNamespace.root, 'logFormat'),
    'string'
  ),
]

const validateConfig = (config: Partial<Config>) => {
  _configItemsToCheck.forEach(x => x(config))
}

const getLogLevelName = (logLevel: log.LogLevelNumbers) => {
  switch (logLevel) {
    case LogLevel.TRACE:
      return 'TRACE'
    case LogLevel.DEBUG:
      return 'DEBUG'
    case LogLevel.INFO:
      return 'INFO'
    case LogLevel.WARN:
      return 'WARN'
    case LogLevel.ERROR:
      return 'ERROR'
    case LogLevel.SILENT:
      return 'SILENT'
    default:
      throw new Error(`Unhandled log level ${logLevel}`)
  }
}

const getLayerKey = (layerDescription: LayerDescription): string => {
  return Array.isArray(layerDescription)
    ? layerDescription.join('-')
    : (layerDescription as string)
}

const getLayersUnavailable = (allLayers: readonly LayerDescription[]) => {
  const layerToChoices: Record<string, string[]> = allLayers.reduce(
    (acc, layer, index) => {
      const antiLayers = allLayers.slice(index + 1)
      // If we are dealing with a composite, we need to break it up
      if (Array.isArray(layer)) {
        return layer.reduce((inner, compositeLayer, i) => {
          // We don't want to give access to the composite layers further up ahead.
          const nestedAntiLayers = layer.slice(i + 1)
          return merge(inner, {
            [compositeLayer]: antiLayers.concat(nestedAntiLayers),
          })
        }, acc)
      }
      const key = getLayerKey(layer)
      return merge(acc, {
        [key]: allLayers.slice(index + 1),
      })
    },
    {}
  )
  return (layer: string) => {
    const choices = layerToChoices[layer]
    if (!choices) {
      throw new Error(`${layer} is not a valid layer choice`)
    }
    return choices
  }
}

const isConfig = <TConfig extends Config>(obj: any): obj is TConfig => {
  if (typeof obj === 'string') {
    return false
  }
  return Boolean(
    get(obj, _getNamespaceProperty(CoreNamespace.root, 'layerOrder'))
  )
}

const getNamespace = (packageName: string, app?: string) => {
  if (app) {
    return `${packageName}/${app}`
  }
  return packageName
}

// @ts-ignore
const DoNothingFetcher: ModelInstanceFetcher = (
  model: any,
  primarykey: PrimaryKeyType
): Promise<PrimaryKeyType> => Promise.resolve(primarykey)

export {
  featurePassThrough,
  getLogLevelName,
  validateConfig,
  getLayersUnavailable,
  isConfig,
  getNamespace,
  DoNothingFetcher,
}
