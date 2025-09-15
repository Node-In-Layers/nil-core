import get from 'lodash/get.js'
import merge from 'lodash/merge.js'
import omit from 'lodash/omit.js'
import { ModelInstanceFetcher, PrimaryKeyType } from 'functional-models'
import { wrap } from './utils.js'
import {
  Config,
  CoreNamespace,
  LayerDescription,
  LogLevel,
  LogLevelNames,
  ErrorObject,
  CrossLayerProps,
  LogId,
} from './types.js'

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
    _getNamespaceProperty(CoreNamespace.root, 'logging.logLevel'),
    'string'
  ),
  configItemIsType(
    _getNamespaceProperty(CoreNamespace.root, 'logging.logFormat'),
    'string'
  ),
]

const validateConfig = (config: Partial<Config>) => {
  _configItemsToCheck.forEach(x => x(config))
}

const getLogLevelName = (logLevel: LogLevel) => {
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

const getLogLevelNumber = (logLevel: LogLevelNames) => {
  switch (logLevel) {
    case LogLevelNames.trace:
      return LogLevel.TRACE
    case LogLevelNames.warn:
      return LogLevel.WARN
    case LogLevelNames.debug:
      return LogLevel.DEBUG
    case LogLevelNames.info:
      return LogLevel.INFO
    case LogLevelNames.error:
      return LogLevel.ERROR
    case LogLevelNames.silent:
      return LogLevel.SILENT
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
        const compositeAnti = layer.reduce((inner, compositeLayer, i) => {
          // We don't want to give access to the composite layers further up ahead.
          const nestedAntiLayers = layer.slice(i + 1)
          return merge(inner, {
            [compositeLayer]: antiLayers.concat(nestedAntiLayers),
          })
        }, acc)
        return compositeAnti
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

/**
 * Converts an Error object to a standard ErrorObject structure.
 * This is an internal helper used by createErrorObject.
 *
 * @param error - The error to convert
 * @param code - The error code to use
 * @param message - The error message to use
 * @returns An ErrorObject representation of the error
 */
const _convertErrorToCause = (
  error: Error,
  code: string,
  message: string
): ErrorObject => {
  // Build the error details object
  const errorObj = {
    error: {
      code,
      message: message || error.message,
    },
  }

  // Add details from the error
  if (error.message) {
    return merge({}, errorObj, {
      error: {
        details: error.message,
      },
    })
  }

  // Handle nested cause if available
  if (error.cause) {
    const causeObj = _convertErrorToCause(
      error.cause as Error,
      'NestedError',
      (error.cause as Error).message
    )

    return merge({}, errorObj, {
      error: {
        cause: causeObj.error,
      },
    })
  }
  // Return the final error object
  return errorObj
}

/**
 * Creates a standardized error object for consistent error handling across the application.
 * This function handles all the logic for converting different error types to the standard format.
 *
 * @param code - A unique string code for the error
 * @param message - A user-friendly error message
 * @param error - Optional error object or details (can be any type - will be properly handled)
 * @returns A standardized error object conforming to the ErrorObject type
 */
const createErrorObject = (
  code: string,
  message: string,
  error?: unknown
): ErrorObject => {
  // Create base error details
  const baseErrorObj = {
    error: {
      code,
      message,
    },
  }

  // Return early if no additional error information
  if (!error) {
    return baseErrorObj
  }

  // Handle different types of error input
  if (error instanceof Error) {
    const errorDetails = {
      error: {
        details: error.message,
        errorDetails: `${error}`,
      },
    }
    // Add cause if available
    if (error.cause) {
      const causeObj = _convertErrorToCause(
        error.cause as Error,
        'CauseError',
        (error.cause as Error).message
      )

      return merge({}, baseErrorObj, errorDetails, {
        error: {
          cause: causeObj.error,
        },
      })
    }

    return merge({}, baseErrorObj, errorDetails)
  }

  if (typeof error === 'string') {
    return merge({}, baseErrorObj, {
      error: {
        details: error,
      },
    })
  }
  // For Record<string, JsonAble> or any object that can be serialized
  if (error !== null && typeof error === 'object' && !Array.isArray(error)) {
    // eslint-disable-next-line functional/no-try-statements
    try {
      // Test if it can be serialized
      JSON.stringify(error)
      return merge({}, baseErrorObj, {
        error: {
          data: error,
        },
      })
    } catch {
      // If not serializable, convert to string
      return merge({}, baseErrorObj, {
        error: {
          details: String(error),
        },
      })
    }
  }

  // Handle arrays or any other types
  return merge({}, baseErrorObj, {
    error: {
      details: String(error),
    },
  })
}

const isErrorObject = (value: unknown): value is ErrorObject => {
  return typeof value === 'object' && value !== null && 'error' in value
}

const combineCrossLayerProps = (
  crossLayerPropsA: CrossLayerProps,
  crossLayerPropsB: CrossLayerProps
) => {
  const loggingData = crossLayerPropsA.logging || {}
  const ids = loggingData.ids || []
  const currentIds = crossLayerPropsB.logging?.ids || []

  //start with logger ids
  const existingIds = ids.reduce(
    (acc, obj) => {
      return Object.entries(obj).reduce((accKeys, [key, value]) => {
        return merge(accKeys, { [`${key}:${value}`]: key })
      }, acc)
    },
    {} as Record<string, string>
  )

  //start with cross layer ids
  const unique = currentIds.reduce(
    (acc, passedIn) => {
      const keys = Object.entries(passedIn)
      const newKeys = keys
        .filter(([key, value]) => !(`${key}:${value}` in existingIds))
        .map(([key, value]) => ({ [key]: value }))
      if (newKeys.length > 0) {
        return acc.concat(newKeys)
      }
      return acc
    },
    [] as readonly LogId[]
  )

  const finalIds = ids.concat(unique)
  return merge(
    {
      ids: finalIds,
    },
    omit(loggingData, 'ids')
  )
}

export {
  createErrorObject,
  featurePassThrough,
  getLogLevelName,
  validateConfig,
  getLayersUnavailable,
  isConfig,
  getNamespace,
  DoNothingFetcher,
  getLogLevelNumber,
  isErrorObject,
  combineCrossLayerProps,
}
