import get from 'lodash/get.js'
import { LogLevelNames, CrossLayerProps, Logger, LogId } from '../types.js'
import { combineCrossLayerProps } from '../libs.js'

const MAX_LOG_CHARACTERS = 50000

const defaultGetFunctionWrapLogLevel = (layerName: string): LogLevelNames => {
  switch (layerName) {
    case 'features':
    case 'entries':
      return LogLevelNames.info
    case 'services':
      return LogLevelNames.trace
    default:
      return LogLevelNames.debug
  }
}

/**
 * Gets the cross layer props and combines it with information from the logger.
 * Does this in a "smart" way.
 *
 * The result of this can be dumped directly into applyData.
 *
 * @param {Logger} logger
 * @param {CrossLayerProps} crossLayerProps
 */
const combineLoggingProps = (
  logger: Logger,
  crossLayerProps?: CrossLayerProps
) => {
  return combineCrossLayerProps(
    {
      logging: {
        ids: logger.getIds(),
      },
    },
    crossLayerProps || {}
  ).logging
}

const isCrossLayerLoggingProps = (
  maybe?: CrossLayerProps
): maybe is CrossLayerProps => {
  return Boolean(get(maybe, 'logging.ids'))
}

// eslint-disable-next-line consistent-return
const capForLogging = (input, maxSize = MAX_LOG_CHARACTERS) => {
  function safeStringify(obj) {
    // eslint-disable-next-line functional/no-try-statements
    try {
      return JSON.stringify(obj)
    } catch {
      return '[Unserializable]'
    }
  }

  const inputType = Array.isArray(input)
    ? 'array'
    : typeof input === 'object' && input !== null
      ? 'object'
      : 'other'
  if (inputType === 'other') {
    return input
  }

  if (safeStringify(input).length <= maxSize) {
    return input
  }

  if (inputType === 'array') {
    // Build a new truncated array functionally
    const build = (arr, idx) => {
      if (idx >= input.length) {
        return arr
      }
      const nextArr = [...arr, input[idx]]
      if (
        safeStringify([
          ...nextArr,
          `[truncated, original length: ${input.length}]`,
        ]).length > maxSize
      ) {
        return [...arr, `[truncated, original length: ${input.length}]`]
      }
      return build(nextArr, idx + 1)
    }
    return build([], 0)
  }

  if (inputType === 'object') {
    // Build a new truncated object functionally
    const keys = Object.keys(input)
    const build = (obj, idx) => {
      if (idx >= keys.length) {
        return obj
      }
      const key = keys[idx]
      const nextObj = { ...obj, [key]: input[key] }
      if (
        safeStringify({
          ...nextObj,
          '[truncated]': `original keys: ${keys.length}`,
        }).length > maxSize
      ) {
        return { ...obj, '[truncated]': `original keys: ${keys.length}` }
      }
      return build(nextObj, idx + 1)
    }
    return build({}, 0)
  }
}

const extractCrossLayerProps = (
  args: any[]
): [any[], CrossLayerProps | undefined] => {
  if (args.length === 0) {
    return [[], undefined]
  }

  const lastArg = args[args.length - 1]

  if (isCrossLayerLoggingProps(lastArg)) {
    // Return all args except the last one, and the last one as CrossLayerProps
    return [args.slice(0, args.length - 1), lastArg]
  }
  // Return all args, and undefined for CrossLayerProps
  return [args, undefined]
}

export {
  defaultGetFunctionWrapLogLevel,
  combineLoggingProps,
  isCrossLayerLoggingProps,
  capForLogging,
  extractCrossLayerProps,
}
