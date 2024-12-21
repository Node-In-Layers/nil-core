import { randomUUID } from 'crypto'
import AsyncLock from 'async-lock'
import get from 'lodash/get.js'
import log from 'loglevel'
import { wrap } from './utils.js'
import { Config, LogLevel } from './types.js'

const lazyValueSync = (method: (...args: any[]) => any) => {
  /* eslint-disable functional/no-let */
  let value: any = undefined
  let called = false
  return (...args: readonly any[]) => {
    if (!called) {
      called = true
      value = method(...args)
    }

    return value
  }
  /* eslint-enable functional/no-let */
}

const lazyValue = <T>(
  method: (...args: any[]) => any
): ((...args: readonly any[]) => Promise<T>) => {
  const key = randomUUID()
  const lock = new AsyncLock()
  /* eslint-disable functional/no-let */
  let value: any = undefined
  let called = false
  return async (...args: readonly any[]) => {
    return lock.acquire(key, async () => {
      if (!called) {
        called = true
        value = await method(...args)
      }

      return value as T
    })
  }
  /* eslint-enable functional/no-let */
}

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
  config.core?.apps.find(app => {
    if (app.name === undefined) {
      throw new Error(`A configured app does not have a name.`)
    }
    return false
  })
  return true
}

const _configItemsToCheck: readonly ((config: Partial<Config>) => void)[] = [
  configHasKey('core.apps'),
  configItemIsArray('core.apps'),
  configHasKey('core.layerOrder'),
  configItemIsArray('core.layerOrder'),
  allAppsHaveAName,
  configItemIsType('core.logLevel', 'string'),
  configItemIsType('core.logFormat', 'string'),
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

export {
  lazyValue,
  lazyValueSync,
  featurePassThrough,
  getLogLevelName,
  validateConfig,
}
