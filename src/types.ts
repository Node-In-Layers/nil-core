/* eslint-disable no-magic-numbers */
import {
  DataDescription,
  ModelFactory,
  ModelInstanceFetcher,
  ModelType,
  JsonAble,
} from 'functional-models'

type ModelConstructor = Readonly<{
  create: <
    T extends DataDescription,
    TModelExtensions extends object = object,
    TModelInstanceExtensions extends object = object,
  >(
    modelProps: ModelProps
  ) => ModelType<T, TModelExtensions, TModelInstanceExtensions>
}>

/**
 * An app.
 * @interface
 */
type App = Readonly<{
  /**
   * The name of the app
   */
  name: string
  /**
   * Optional: Services layer
   */
  services?: AppLayer<Config, any>
  /**
   * Optional: Features layer
   */
  features?: AppLayer<Config, any>
  /**
   * Optional: Globals layer
   */
  globals?: GlobalsLayer<Config, any>
  /**
   * Optional: Models
   */
  models?: Record<string, ModelConstructor>
}>

/**
 * Log Levels
 */
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5,
}
/* eslint-enable no-magic-numbers */

/**
 * Log Levels by names.
 */
enum LogLevelNames {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
  silent = 'silent',
}

/**
 * A Promise or not a promise.
 */
type MaybePromise<T> = Promise<T> | T

/**
 * The format of log messages to the console.
 */
enum LogFormat {
  /**
   * Console logs json
   */
  json = 'json',
  /**
   * A custom logger. (Must provide a RootLogger via customLogger)
   */
  custom = 'custom',
  /**
   * A simple datetime: message log format to console
   */
  simple = 'simple',
  /**
   * Logs messages over TCP. Must provide tcp options in logOptions
   */
  tcp = 'tcp',
  full = 'full',
}

/**
 * A standardized error object.
 * @interface
 */
type ErrorObject = Readonly<{
  /**
   * Shows that this is an error object.
   */
  error: Readonly<{
    /**
     * A unique string code for the error
     */
    code: string
    /**
     * A user friendly error message.
     */
    message: string
    /**
     * Additional details in a string format.
     */
    details?: string
    /**
     * Additional data as an object
     */
    data?: Record<string, JsonAble>
    /**
     * A trace of the error
     */
    trace?: string
    /**
     * A suberror that has the cause of the error.
     */
    cause?: ErrorObject
  }>
}>

/**
 * A log object
 * @interface
 */
type Logger = Readonly<{
  /**
   * Trace statement
   * @param message - The logs message
   * @param dataOrError - An object of data, or an object with errors.
   */
  trace: (
    message: string,
    dataOrError?: Record<string, JsonAble> | ErrorObject
  ) => void
  /**
   * Debug statement
   * @param msg
   */
  debug: (
    message: string,
    dataOrError?: Record<string, JsonAble> | ErrorObject
  ) => void
  /**
   * An info statement
   * @param msg
   */
  info: (
    message: string,
    dataOrError?: Record<string, JsonAble> | ErrorObject
  ) => void
  /**
   * Warning statement
   * @param msg
   */
  warn: (
    message: string,
    dataOrError?: Record<string, JsonAble> | ErrorObject
  ) => void
  /**
   * An error statement.
   * @param msg
   */
  error: (
    message: string,
    dataOrError?: Record<string, JsonAble> | ErrorObject
  ) => void
  /**
   * Embeds data, so that subsequent log messages (and loggers), can log that data without having to know details about it.
   * @param data
   */
  applyData: (data: Record<string, JsonAble>) => Logger
  /**
   * Creates a logger by adding an id to the id stack.
   * @param name - The name of the logger
   * @param logId - The id object.
   */
  getIdLogger: (name: string, logId: LogId) => Logger
  /**
   * Gets a sub logger.
   * @param name - The name of the sub logger.
   */
  getSubLogger: (name: string) => Logger
  /**
   * Gets all ids associated with this logger. Useful for passing on.
   */
  getIds: () => readonly LogId[]
}>

/**
 * A base level log object, that creates a logger
 * @interface
 */
type RootLogger<TConfig extends Config = Config> = Readonly<{
  /**
   * Gets a logger object wrapping the components.
   * @param context - Context used for configuring a logger.
   * @param name - The name of the component doing the logging. Could be an app, a function, etc.
   * @param props - Any additional logging information to include with the logger.
   */
  getLogger: (
    context: CommonContext<TConfig>,
    name: string,
    props?: { ids?: readonly LogId[]; data?: Record<string, any> }
  ) => Logger
}>

/**
 * A log id object.
 * @interface
 */
type LogId = Readonly<Record<string, string>>

/**
 * A fully fleshed out log message.
 * @interface
 */
type LogMessage<T extends Record<string, JsonAble> = Record<string, JsonAble>> =
  Readonly<{
    /**
     * The unique id for this log message. Every log message has a unique id.
     */
    id: string
    /**
     * The name of the logger. This is assembled from nested names joined with ':'.
     */
    logger: string
    /**
     * A stack of ids that get added on and removed. Useful for tracing
     * throughout a system. The first ones, are the oldest, and the last ones are the newest.
     */
    ids?: readonly LogId[]
    /**
     * The log level
     */
    logLevel: LogLevelNames
    /**
     * The datetime of the message
     */
    datetime: Date
    /**
     * The log's message
     */
    message: string
  }> &
    Partial<ErrorObject> &
    T

/**
 * A base functionfunction that can handle a log message.
 */
type LogFunction = (logMessage: LogMessage) => void | Promise<void>

/**
 * A method that can do logging once given a context.
 */
type LogMethod<TConfig extends Config = Config> = (
  context: CommonContext<TConfig>
) => LogFunction

/**
 * Core Namespaces.
 */
enum CoreNamespace {
  root = '@node-in-layers/core',
  globals = '@node-in-layers/core/globals',
  layers = '@node-in-layers/core/layers',
  models = '@node-in-layers/core/models',
}

/**
 * A generic layer
 */
type GenericLayer = Record<string, any>

/**
 * Props that go into a model constructor.
 * @interface
 */
type ModelProps<
  TModelOverrides extends object = object,
  TModelInstanceOverrides extends object = object,
> = Readonly<{
  Model: ModelFactory<TModelOverrides, TModelOverrides>
  fetcher: ModelInstanceFetcher<TModelOverrides, TModelInstanceOverrides>
  getModel: <T extends DataDescription>(
    namespace: string,
    modelName: string
  ) => () => ModelType<T, TModelOverrides, TModelInstanceOverrides>
}>

/**
 * Custom model properties. getModel is provided by the framework.
 * @interface
 */
type PartialModelProps<
  TModelOverrides extends object = object,
  TModelInstanceOverrides extends object = object,
> = Readonly<{
  Model: ModelFactory<TModelOverrides, TModelOverrides>
  fetcher: ModelInstanceFetcher<TModelOverrides, TModelInstanceOverrides>
}>

/**
 * A function that can get model props from a services context.
 */
type GetModelPropsFunc = (
  context: ServicesContext,
  ...args: any[]
) => PartialModelProps

/**
 * Services for the layer app
 */
type LayerServices = Readonly<{
  /**
   * The standard default function for getting model props
   */
  getModelProps: (context: ServicesContext) => ModelProps
  /**
   * Loads a layer.
   * @param app
   * @param layer
   * @param existingLayers
   */
  loadLayer: (
    app: App,
    layer: string,
    existingLayers: LayerContext
  ) => MaybePromise<GenericLayer | undefined>
}>

/**
 * The services layer for the core layers app
 * @interface
 */
type LayerServicesLayer = {
  /**
   * Services
   */
  services: {
    [CoreNamespace.layers]: LayerServices
  }
}

type LayerComponentNames = readonly string[]
type SingleLayerName = string
type LayerDescription = string | readonly string[]

type ModelToModelFactoryNamespace = Record<string, string | [string, any[]]>
type NamespaceToFactory = Record<string, ModelToModelFactoryNamespace>

/**
 * The core configurations
 * @interface
 */
type CoreConfig = Readonly<{
  /**
   * Options for logging.
   */
  logging: {
    /**
     * The log level to log at. Anything below this level, and it'll be ignored.
     */
    logLevel: LogLevelNames
    /**
     * The format of log messages. If multiple are included, then multiple logging approaches will be used.
     */
    logFormat: LogFormat | readonly LogFormat[]
    /**
     * When logFormat is tcp, these options are used to configure AXIOS.
     */
    tcpLoggingOptions?: Readonly<{
      /**
       * The url to log to.
       */
      url: string
      /**
       * Any headers that are needed, such api keys.
       */
      headers?: Record<string, string | object>
    }>
    /**
     * A custom RootLogger that replaces the default one.
     */
    customLogger?: RootLogger
  }
  /**
   * The layers to be loaded, in their order.
   * Can be either string names for regular layers, or an array of strings, for a composite layer with multiple sub-layers.
   */
  layerOrder: readonly LayerDescription[]
  /**
   * Already loaded apps.
   * Most often take the form of doing require/imports directly in the config.
   */
  apps: readonly App[]
  /**
   * Optional: The namespace to the app.services that has a "getModelProps()" function used for loading models
   */
  modelFactory?: string
  /**
   * Optional: When true, wrappers are built around models to bubble up CRUDS interfaces for models through services and features.
   */
  modelCruds?: boolean
  /**
   * Optional: Provides granular getModelProps() for specific models.
   */
  customModelFactory?: NamespaceToFactory
}>

/**
 * A basic config object
 * @interface
 */
type Config = Readonly<{
  /**
   * The systems name
   */
  systemName: string
  /**
   * The environment
   */
  environment: string
  /**
   * Core level configurations
   */
  [CoreNamespace.root]: CoreConfig
}>

/**
 * A generic layer within an app
 * @interface
 */
type AppLayer<
  TConfig extends Config = Config,
  TContext extends object = object,
  TLayer extends object = object,
> = Readonly<{
  /**
   * Creates the layer.
   * @param context
   */
  create: (context: LayerContext<TConfig, TContext>) => MaybePromise<TLayer>
}>

/**
 * The base level context that everything recieves.
 * @interface
 */
type CommonContext<TConfig extends Config = Config> = Readonly<{
  /**
   * The configuration file.
   */
  config: TConfig
  /**
   * A root logger.
   */
  log: RootLogger
  /**
   * Constants.
   */
  constants: {
    /**
     * The environment
     */
    environment: string
    /**
     * The working directory.
     */
    workingDirectory: string
    /**
     * A uuid that represents the runtime.
     */
    runtimeId: string
  }
}>

/**
 * The context for a layer
 */
type LayerContext<
  TConfig extends Config = Config,
  TContext extends object = object,
> = CommonContext<TConfig> & TContext

/**
 * A context for layers that consume services. (Services and features generally)
 * @interface
 */
type ServicesContext<
  TConfig extends Config = Config,
  TServices extends object = object,
  TContext extends object = object,
> = LayerContext<
  TConfig,
  {
    /**
     * A models object that has namespace to an object that has "getModels()"
     */
    models: Record<
      string,
      {
        /**
         * Gets the models for this given namespace.
         */
        getModels: <TModelType extends ModelType<any>>() => Record<
          string,
          TModelType
        >
      }
    >
    /**
     * A services object.
     */
    services: TServices
  } & TContext
>

/**
 * A factory for creating the service.
 * @interface
 */
type ServicesLayerFactory<
  TConfig extends Config = Config,
  TServices extends object = object,
  TContext extends object = object,
  TLayer extends object = object,
> = Readonly<{
  /**
   * Creates the services layer
   * @param context
   */
  create: (context: ServicesContext<TConfig, TServices, TContext>) => TLayer
}>

type GlobalsLayer<
  TConfig extends Config = Config,
  TGlobals extends object = object,
> = Readonly<{
  create: (context: CommonContext<TConfig>) => Promise<TGlobals>
}>

/**
 * A context for layers that consume features. (Features and entries generally)
 * @interface
 */
type FeaturesContext<
  TConfig extends Config = Config,
  TServices extends object = object,
  TFeatures extends object = object,
  TGlobals extends object = object,
> = LayerContext<
  TConfig,
  {
    /**
     * Services
     */
    services: TServices
    /**
     * Features
     */
    features: TFeatures
  } & TGlobals
>

type FeaturesLayerFactory<
  TConfig extends Config = Config,
  TContext extends object = object,
  TServices extends object = object,
  TFeatures extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (
    context: FeaturesContext<TConfig, TServices, TFeatures, TContext>
  ) => TLayer
}>

/**
 * Describes a complete system, with services and features.
 */
type System<
  TConfig extends Config = Config,
  TServices extends object = object,
  TFeatures extends object = object,
> = CommonContext<TConfig> & {
  services: TServices
  features: TFeatures
}

export {
  Config,
  App,
  LogFormat,
  LogLevel,
  LogLevelNames,
  AppLayer,
  LayerContext,
  ServicesContext,
  ServicesLayerFactory,
  FeaturesContext,
  System,
  RootLogger,
  CommonContext,
  CoreNamespace,
  FeaturesLayerFactory,
  Logger,
  LayerComponentNames,
  SingleLayerName,
  LayerDescription,
  MaybePromise,
  LayerServices,
  GenericLayer,
  LayerServicesLayer,
  ModelProps,
  ModelConstructor,
  GetModelPropsFunc,
  PartialModelProps,
  LogMessage,
  LogFunction,
  LogMethod,
  LogId,
  CoreConfig,
  ErrorObject,
}
