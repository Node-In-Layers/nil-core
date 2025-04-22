import { isPromise } from 'node:util/types'
import merge from 'lodash/merge.js'
import flatten from 'lodash/flatten.js'
import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import axios from 'axios'
import { v4 } from 'uuid'
import { JsonAble } from 'functional-models'
import { getLogLevelNumber } from '../libs.js'
import {
  CommonContext,
  Config,
  CoreNamespace,
  ErrorObject,
  LogFormat,
  Logger,
  LogId,
  LogLevel,
  LogLevelNames,
  LayerLogger,
  LogMessage,
  LogMethod,
  RootLogger,
  CommonLayerName,
  CrossLayerProps,
  AppLogger,
  LogWrapAsync,
  LogWrapSync,
  MaybePromise,
} from '../types.js'
import { memoizeValueSync } from '../utils.js'
import {
  defaultGetFunctionWrapLogLevel,
  combineLoggingProps,
  isCrossLayerLoggingProps,
} from './lib.js'

const MAX_LOGGING_ATTEMPTS = 5

const _combineIds = (id: readonly LogId[]) => {
  return id
    .map(i => {
      return Object.entries(i)
        .map(([key, value]) => {
          return `${key}:${value}`
        })
        .join(';')
    })
    .join(';')
}

/**
 * A simple LogFunction that provides datetime: message
 * @param logMessage
 */
const consoleLogSimple = (logMessage: LogMessage) => {
  // @ts-ignore
  // eslint-disable-next-line no-console
  console[logMessage.logLevel](
    `${logMessage.datetime.toISOString()}: ${logMessage.message}`
  )
}

/**
 * A simple LogFunction that logs more data as a single string.
 * @param logMessage
 */
const consoleLogFull = (logMessage: LogMessage) => {
  return logMessage.ids
    ? // @ts-ignore
      // eslint-disable-next-line no-console
      console[logMessage.logLevel](
        `${logMessage.datetime.toISOString()} ${logMessage.environment} ${logMessage.logLevel} ${logMessage.id} [${logMessage.logger}] {${_combineIds(logMessage.ids)}} ${logMessage.message}`
      )
    : // eslint-disable-next-line no-console
      console[logMessage.logLevel](
        `${logMessage.datetime.toISOString()} ${logMessage.environment} ${logMessage.logLevel} [${logMessage.logger}] ${logMessage.message}`
      )
}

/**
 * A simple LogFunction that logs a message as a json object.
 * @param logMessage
 */
const consoleLogJson = (logMessage: LogMessage) => {
  // @ts-ignore
  // eslint-disable-next-line no-console
  console[logMessage.logLevel](
    JSON.stringify(
      {
        id: logMessage.id,
        datetime: logMessage.datetime.toISOString(),
        logLevel: logMessage.logLevel,
        logger: logMessage.logger,
        message: logMessage.message,
        // Remove the ones listed above
        ...omit(logMessage, [
          'id',
          'datetime',
          'message',
          'logger',
          'logLevel',
        ]),
      },
      null
    )
  )
}

const _shouldIgnore = (
  logLevel: LogLevelNames,
  messageLogLevel: LogLevelNames
) => {
  const asInt = getLogLevelNumber(logLevel)
  if (asInt === LogLevel.SILENT) {
    return true
  }
  const asInt2 = getLogLevelNumber(messageLogLevel)
  return asInt > asInt2
}

/**
 * A LogMethod that creates a TCP call using a LogMessage object as the body.
 * tcpLoggingOptions must be set in the configuration file.
 * @param context
 */
const logTcp = (context: CommonContext) => {
  const tcpOptions =
    context.config[CoreNamespace.root].logging.tcpLoggingOptions
  if (!tcpOptions) {
    throw new Error(`Must include tcpLoggingOptions when using a tcp logger`)
  }
  const url = tcpOptions.url
  const axiosInstance = axios.create({
    baseURL: url,
    headers: tcpOptions.headers,
  })
  return (logMessage: LogMessage) => {
    // Sometimes, logging frameworks can fail, so we should try multiple attempts.
    return [...new Array(MAX_LOGGING_ATTEMPTS)].reduce(
      async accP => {
        const acc = await accP
        if (acc) {
          return acc
        }
        return axiosInstance({
          data: logMessage,
        })
          .then(() => {
            return true
          })
          .catch(e => {
            // TODO: Narrow down the scope of these catches
            console.warn('Logging error')
            console.warn(e)
            return false
          })
      },
      Promise.resolve(undefined) as Promise<any>
    )
  }
}

const _getLogMethodFromFormat = (
  logFormat: LogFormat | readonly LogFormat[]
): readonly LogMethod[] => {
  if (Array.isArray(logFormat)) {
    return flatten(
      logFormat.map(_getLogMethodFromFormat)
    ) as readonly LogMethod[]
  }
  switch (logFormat) {
    case LogFormat.custom:
      throw new Error(
        `This should never be here. customLogger should override this`
      )
    case LogFormat.json:
      return [() => consoleLogJson]
    case LogFormat.simple:
      return [() => consoleLogSimple]
    case LogFormat.full:
      return [() => consoleLogFull]
    case LogFormat.tcp:
      return [logTcp]
    default:
      throw new Error(`LogFormat ${logFormat} is not supported`)
  }
}

const _isErrorObj = (obj: any): obj is ErrorObject => {
  return Boolean(get(obj, 'error'))
}

const _layerLogger = <TConfig extends Config = Config>(
  context: CommonContext<TConfig>,
  subLogger: Logger,
  layerName: CommonLayerName | string,
  crossLayerProps?: CrossLayerProps
): LayerLogger => {
  const theLogger1 = subLogger.getSubLogger(layerName).applyData({
    layer: layerName,
  })
  // we have to do this, to get the id being created
  const theLogger = theLogger1.applyData(
    combineLoggingProps(theLogger1, crossLayerProps)
  )
  const logLevelGetter =
    get(
      context,
      `config${CoreNamespace.root}.logging.getFunctionWrapLogLevel`
    ) || defaultGetFunctionWrapLogLevel

  const getFunctionLogger = (
    functionName: string,
    crossLayerProps?: CrossLayerProps
  ) => {
    const funcLogger = theLogger
      .getIdLogger(functionName, 'functionCall', v4())
      .applyData({
        function: functionName,
      })
    return funcLogger.applyData(
      combineLoggingProps(funcLogger, crossLayerProps)
    )
  }

  return merge({}, theLogger, {
    logWrapAsync: <T, A extends Array<any>>(
      functionName: string,
      func: LogWrapAsync<T, A>
    ) => {
      // @ts-ignore
      const logLevel = logLevelGetter(layerName, functionName)
      return (...a: A) => {
        const crossLayer =
          a && a.length > 0 && isCrossLayerLoggingProps(a.slice(-1)[0])
            ? a.slice(-1)[0]
            : undefined
        const funcLogger = getFunctionLogger(functionName, crossLayer)
        funcLogger[logLevel]('Executing feature')
        // @ts-ignore
        return func(funcLogger, ...a)
          .then(r => {
            funcLogger[logLevel]('Function executed')
            return r
          })
          .catch(e => {
            funcLogger.error('Function failed with an exception', {
              error: {},
            })
            throw e
          })
      }
    },
    logWrapSync: <T, A extends Array<any>>(
      functionName: string,
      func: LogWrapSync<T, A>
    ) => {
      // @ts-ignore
      const logLevel = logLevelGetter(layerName, functionName)
      return (...a: A) => {
        const crossLayer =
          a && a.length > 0 && isCrossLayerLoggingProps(a.slice(-1)[0])
            ? a.slice(-1)[0]
            : undefined
        const funcLogger = getFunctionLogger(functionName, crossLayer)
        funcLogger[logLevel]('Executing feature')
        // eslint-disable-next-line
        try {
          // @ts-ignore
          const result = func(funcLogger, ...a)
          funcLogger[logLevel]('Feature executed')
          return result
        } catch (e) {
          funcLogger.error('Feature failed with an exception', {
            error: {},
          })
          throw e
        }
      }
    },
    getFunctionLogger,
  })
}

const _appLogger = <TConfig extends Config = Config>(
  context: CommonContext<TConfig>,
  subLogger: Logger,
  appName: string
): AppLogger => {
  const theLogger = subLogger.getSubLogger(appName).applyData({
    app: appName,
  })
  return merge({}, theLogger, {
    getLayerLogger: (
      layerName: CommonLayerName | string,
      crossLayerProps?: CrossLayerProps
    ) => {
      return _layerLogger<TConfig>(
        context,
        theLogger,
        layerName,
        crossLayerProps
      )
    },
  })
}

/**
 * Creates a sub logger
 * @param context - The context
 * @param logMethods - The logging methods
 * @param props - Values that are passed along to each sub logger.
 */
const _subLogger = <TConfig extends Config = Config>(
  context: CommonContext<TConfig>,
  logMethods: readonly LogMethod<TConfig>[],
  props: {
    names: readonly string[]
    ids?: readonly LogId[]
    data?: Record<string, JsonAble>
  }
): Logger => {
  const theLogLevel = context.config[CoreNamespace.root].logging.logLevel
  const getLogMethods = logMethods.map(memoizeValueSync)

  const _doLog =
    (logLevel: LogLevelNames) =>
    (
      message: string,
      dataOrError?: Record<string, JsonAble> | ErrorObject
    ): MaybePromise<void> => {
      if (_shouldIgnore(theLogLevel, logLevel)) {
        return undefined
      }
      const funcs = getLogMethods.map(x => x(context))
      const isError = _isErrorObj(dataOrError)
      const data = merge({}, props.data, isError ? {} : dataOrError)
      const logMessage = {
        id: v4(),
        environment: context.constants.environment,
        datetime: new Date(),
        logLevel,
        message,
        ids: props.ids,
        logger: props.names.join(':'),
        ...(isError ? { error: dataOrError.error } : {}),
        ...data,
        ...omit(props, ['ids', 'names', 'data', 'error']),
      }
      const result = funcs.map(x => {
        return x(logMessage)
      })
      const promises = result.filter(isPromise)
      if (promises.length > 0) {
        return Promise.resolve().then(async () => {
          await Promise.all(promises)
          return
        })
      }
      return undefined
    }

  return {
    getIds: () => get(props, 'ids', [] as readonly LogId[]),
    debug: _doLog(LogLevelNames.debug),
    info: _doLog(LogLevelNames.info),
    warn: _doLog(LogLevelNames.warn),
    trace: _doLog(LogLevelNames.debug),
    error: _doLog(LogLevelNames.error),
    getSubLogger: (name: string) => {
      return _subLogger(context, logMethods, {
        names: props.names.concat(name),
        ids: props.ids,
        data: props.data,
      })
    },
    getIdLogger: (name: string, logIdOrKey: LogId | string, value?: string) => {
      const isObject = typeof logIdOrKey === 'object'
      if (!isObject) {
        if (!value) {
          throw new Error(`Need value if providing a key`)
        }
      }
      const logId = isObject ? logIdOrKey : { [logIdOrKey]: value as string }
      return _subLogger(context, logMethods, {
        names: props.names.concat(name),
        ids: get(props, 'ids', [] as LogId[]).concat(logId),
        data: props.data,
      })
    },
    applyData: (data: Record<string, JsonAble>) => {
      return _subLogger(context, logMethods, merge({}, props, data))
    },
  }
}

const _getIdsWithRuntime = (
  runtimeId: string,
  props?: { ids?: readonly LogId[] }
) => {
  const theIds: readonly LogId[] = [{ runtimeId }]
  if (!props?.ids) {
    return theIds
  }
  const ids = props.ids
  const hasRuntimeId = ids.find(obj => {
    return Object.keys(obj).find(y => y === 'runtimeId')
  })
  if (hasRuntimeId) {
    return props.ids
  }
  return theIds.concat(props.ids)
}

/**
 * The standard RootLogger for the core library.
 */
const standardLogger = <
  TConfig extends Config = Config,
>(): RootLogger<TConfig> => {
  const getLogger = (
    context: CommonContext<TConfig>,
    props?: { ids?: readonly LogId[]; data?: Record<string, JsonAble> }
  ) => {
    if (context.config[CoreNamespace.root].logging.customLogger) {
      const ids = _getIdsWithRuntime(context.constants.runtimeId, props)
      return context.config[CoreNamespace.root].logging.customLogger.getLogger(
        context,
        merge({}, props, { ids })
      )
    }
    const logMethods = _getLogMethodFromFormat(
      context.config[CoreNamespace.root].logging.logFormat
    )
    return compositeLogger<TConfig>(logMethods).getLogger(context, props)
  }

  return {
    getLogger,
  }
}

/**
 * A useful RootLogger that can combine multiple logging methods together. Useful as the best of custom RootLoggers
 * because this provides everything, except the actual function that does the logging.
 * @param logMethods - A list of log methods.
 */
const compositeLogger = <TConfig extends Config = Config>(
  logMethods: readonly LogMethod<TConfig>[]
): RootLogger<TConfig> => {
  const getLogger = (
    context: CommonContext<TConfig>,
    props?: { ids?: readonly LogId[]; data?: Record<string, JsonAble> }
  ) => {
    const ids = _getIdsWithRuntime(context.constants.runtimeId, props)
    const subLogger = _subLogger<TConfig>(context, logMethods, {
      names: [],
      ids,
      ...(props?.data ? props.data : {}),
    })
    return merge(subLogger, {
      getAppLogger: (appName: string) => {
        return _appLogger(context, subLogger, appName)
      },
    })
  }

  return {
    getLogger,
  }
}

export {
  standardLogger,
  consoleLogSimple,
  consoleLogJson,
  consoleLogFull,
  compositeLogger,
  logTcp,
}
