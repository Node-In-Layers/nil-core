import merge from 'lodash/merge.js'
import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import { LogLevelNames, CrossLayerProps, Logger, LogId } from '../types.js'

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
  const loggingData = crossLayerProps?.logging || {}
  const ids = loggingData.ids || []
  const currentIds = logger.getIds()
  const existingIds = currentIds.reduce(
    (acc, obj) => {
      return Object.keys(obj).reduce((accKeys, key) => {
        return merge(accKeys, { [key]: key })
      }, acc)
    },
    {} as Record<string, string>
  )
  const unique = ids.reduce(
    (acc, passedIn) => {
      const keys = Object.entries(passedIn)
      const newKeys = keys
        .filter(([, value]) => !(value in existingIds))
        .map(([key, value]) => ({ [key]: value }))
      if (newKeys.length > 0) {
        return acc.concat(newKeys)
      }
      return acc
    },
    [] as readonly LogId[]
  )

  return merge(
    {
      ids: logger.getIds().concat(unique),
    },
    omit(loggingData, 'ids')
  )
}

const isCrossLayerLoggingProps = (
  maybe?: CrossLayerProps
): maybe is CrossLayerProps => {
  return Boolean(get(maybe, 'logging.ids'))
}

export {
  defaultGetFunctionWrapLogLevel,
  combineLoggingProps,
  isCrossLayerLoggingProps,
}
