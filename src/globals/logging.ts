import merge from 'lodash/merge.js'
import flatten from 'lodash/flatten.js'
import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import axios from 'axios'
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
  LogMessage,
  LogMethod,
  RootLogger,
} from '../types.js'
import { memoizeValueSync } from '../utils.js'

const MAX_LOGGING_ATTEMPTS = 5

const _combineIds = (id: readonly LogId[]) => {
  return id.map(i => `${i.key}:${i.value}`).join(';')
}

/**
 * A simple LogFunction that provides datetime: message
 * @param logMessage
 */
const consoleLogSimple = (logMessage: LogMessage) => {
  // @ts-ignore
  // eslint-disable-next-line no-console
  console[logMessage.logLevel](`${logMessage.datetime}: ${logMessage.message}`)
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
        `${logMessage.datetime} ${logMessage.logLevel} [${logMessage.names.join(':')}] {${_combineIds(logMessage.ids)}} ${logMessage.message}`
      )
    : // eslint-disable-next-line no-console
      console[logMessage.logLevel](
        `${logMessage.datetime} ${logMessage.logLevel} [${logMessage.names.join(':')}] ${logMessage.message}`
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
        datetime: logMessage.datetime,
        message: logMessage.message,
        logger: logMessage.names.join(':'),
        logLevel: logMessage.logLevel,
        ...omit(logMessage, ['datetime', 'message', 'names', 'logLevel']),
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
    return [...new Array(MAX_LOGGING_ATTEMPTS)].reduce(async accP => {
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
    })
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
    data?: Record<string, any>
  }
): Logger => {
  const theLogLevel = context.config[CoreNamespace.root].logging.logLevel

  const getLogMethods = logMethods.map(memoizeValueSync)

  const _doLog =
    (logLevel: LogLevelNames) =>
    (message: string, dataOrError?: object | ErrorObject) => {
      if (_shouldIgnore(theLogLevel, logLevel)) {
        return
      }
      const funcs = getLogMethods.map(x => x(context))
      const isError = _isErrorObj(dataOrError)
      const data = merge({}, props.data, isError ? {} : dataOrError)
      const logMessage = {
        datetime: new Date(),
        logLevel,
        message,
        ids: props.ids,
        names: props.names,
        data: Object.keys(data).length > 1 ? data : undefined,
        error: isError ? dataOrError.error : undefined,
      }
      funcs.map(x => x(logMessage))
    }

  return {
    debug: _doLog(LogLevelNames.debug),
    info: _doLog(LogLevelNames.info),
    warn: _doLog(LogLevelNames.warn),
    trace: _doLog(LogLevelNames.trace),
    error: _doLog(LogLevelNames.error),
    getSubLogger: (name: string) => {
      return _subLogger(context, logMethods, {
        names: props.names.concat(name),
        ids: props.ids,
        data: props.data,
      })
    },
    getIdLogger: (name: string, logId: LogId) => {
      return _subLogger(context, logMethods, {
        names: props.names.concat(name),
        ids: get(props, 'ids', [] as LogId[]).concat(logId),
        data: props.data,
      })
    },
    applyData: (data: Record<string, any>) => {
      return _subLogger(context, logMethods, merge({}, props, data))
    },
  }
}

/**
 * The standard RootLogger for the core library.
 */
const standardLogger = <
  TConfig extends Config = Config,
>(): RootLogger<TConfig> => {
  const getLogger = (
    context: CommonContext<TConfig>,
    name: string,
    props?: { ids?: readonly LogId[]; data?: Record<string, any> }
  ) => {
    if (context.config[CoreNamespace.root].logging.customLogger) {
      return context.config[CoreNamespace.root].logging.customLogger.getLogger(
        context,
        name,
        props
      )
    }
    const logMethods = _getLogMethodFromFormat(
      context.config[CoreNamespace.root].logging.logFormat
    )
    return compositeLogger<TConfig>(logMethods).getLogger(context, name, props)
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
    name: string,
    props?: { ids?: readonly LogId[]; data?: Record<string, any> }
  ) => {
    return _subLogger<TConfig>(context, logMethods, {
      names: [name],
      ids: props?.ids,
      data: props?.data,
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
