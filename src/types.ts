import z, { ZodType } from 'zod'
import {
  DataDescription,
  ModelFactory,
  ModelInstanceFetcher,
  ModelType,
  JsonAble,
  JsonObj,
  PrimaryKeyType,
  PrimaryKeyGenerator,
  PrimaryKeyPropertyType,
  MaybeFunction,
  DatabaseKeyPropertyConfig,
  PrimaryKeyProperty,
  ForeignKeyProperty,
} from 'functional-models'

export type ModelConstructor = Readonly<{
  create: <
    T extends DataDescription,
    TModelExtensions extends object = object,
    TModelInstanceExtensions extends object = object,
  >(
    modelProps: ModelProps
  ) => ModelType<T, TModelExtensions, TModelInstanceExtensions>
}>

/**
 * A domain within a system.
 * @interface
 */
export type App = Readonly<{
  /**
   * The name of the domain
   */
  name: string
  /**
   * The description of the domain
   */
  description?: string
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

/* eslint-disable no-magic-numbers */
/**
 * Log Levels
 */
export enum LogLevel {
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
export enum LogLevelNames {
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
export type MaybePromise<T> = Promise<T> | T

/**
 * The format of log messages to the console.
 */
export enum LogFormat {
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
  /**
   * Forwards log messages to the OpenTelemetry Logs API (e.g. when logging.otel is configured).
   */
  otel = 'otel',
  full = 'full',
}

/**
 * A standardized error object.
 * @interface
 */
export type ErrorObject = Readonly<{
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
 * Common props that can be passed between layers
 * @interface
 */
export type CrossLayerProps<T extends object = object> = Readonly<{
  logging?: {
    ids?: readonly LogId[]
  }
}> &
  T

/**
 * A very useful way to describe all layered functions, so that crossLayer
 * props can be passed through a system.
 * @example
 * ```typescript
 * type MyService = Readonly<{
 *   myFunc: LayerFunction<(myArg: string) => Promise<string>>
 * }>
 * ```
 * This creates an object...
 *
 * @example
 * ```typescript
 * {
 *   myFunc: (myArg: strinng, crossLayerProps) => Promise<string>
 * }
 * ```
 * @interface
 */
export type LayerFunction<T extends (...args: any[]) => any> = T extends (
  ...args: infer Args
) => infer ReturnType
  ? (...args: [...Args, crossLayerProps?: CrossLayerProps]) => ReturnType
  : never

/**
 * A function argument that types inputs and outputs.
 */
export type TypedFunction<T, A extends Array<any>> = (...args: A) => T

/**
 * A function that is wrapped with logging calls.
 */
export type LogWrapSync<T, A extends Array<any>> = (
  functionLogger: FunctionLogger,
  ...args: A
) => T

/**
 * A function argument that types inputs and outputs and is a promise.
 */
export type TypedFunctionAsync<T, A extends Array<any>> = (
  ...args: A
) => Promise<T>

/**
 * An Async function that is wrapped with logging functions.
 */
export type LogWrapAsync<T, A extends Array<any>> = (
  functionLogger: FunctionLogger,
  ...args: A
) => Promise<T>

/**
 * A function level logger.
 */
export type FunctionLogger = Logger

/**
 * A logger for a layer. (Services/Features/etc)
 * Already has the domain's name appended to the logging data as well as the runtimeId.
 * @interface
 */
export type LayerLogger = Logger &
  Readonly<{
    /**
     * A generic function for wrapping logs. Not generally intended to be used
     * by users, but used internally.
     * @param functionName - The name of the function
     * @param func - The function itself
     */
    _logWrap: <T, A extends Array<any>>(
      functionName: string,
      func: LogWrapAsync<T, A> | LogWrapSync<T, A>
    ) => (...a: A) => Promise<T> | T
    /**
     * Creates a logging wrap around a function. This should be used on asynchronous functions.
     * Executes the function when called but will create a start and end message.
     * The first argument is the logger, followed by the normal arguments.
     * Should automatically handle error logging as well.
     * NOTE: This function automatically handles crossLayerProps, assuming its the final argument in the function call.
     * @param functionName - The name of the function
     * @param func - The function itself
     */
    _logWrapAsync: <T, A extends Array<any>>(
      functionName: string,
      func: LogWrapAsync<T, A>
    ) => (...a: A) => Promise<T>
    /**
     * Creates a logging wrap around a synchronous function. This should be used on synchronous functions.
     * Executes the function when called but will create a start and end message.
     * The first argument is the logger, followed by the normal arguments.
     * Should automatically handle error logging as well.
     * NOTE: This function automatically handles crossLayerProps, assuming its the final argument in the function call.
     * @param functionName - The name of the function
     * @param func - The function itself
     */
    _logWrapSync: <T, A extends Array<any>>(
      functionName: string,
      func: LogWrapSync<T, A>
    ) => (...a: A) => T
    /**
     * Gets a function level logger. This is not the recommended logger for most uses especially within layers.
     * Use getInnerLogger.
     * A common pattern is to wrap the
     * @param name - The name of the function
     * @param crossLayerProps - Any additional crossLayerProps.
     */
    getFunctionLogger: (
      name: string,
      crossLayerProps?: CrossLayerProps
    ) => FunctionLogger
    /**
     * The primary recommended way to log within a function. Creates a logger within a function, makes sure the ids are passed along.
     * @param functionName - The name of the function
     * @param crossLayerProps - Any additional crossLayerProps.
     */
    getInnerLogger: (
      functionName: string,
      crossLayerProps?: CrossLayerProps
    ) => FunctionLogger
  }>

/**
 * A logger for an domain.
 * @interface
 */
export type AppLogger = Logger &
  Readonly<{
    getLayerLogger: (
      layerName: CommonLayerName | string,
      crossLayerProps?: CrossLayerProps
    ) => LayerLogger
  }>

type GetAppLogger = (domainName: string) => AppLogger

export enum CommonLayerName {
  models = 'models',
  services = 'services',
  features = 'features',
  entries = 'entries',
}

/**
 * Options for a specific instance of logging.
 */
export type LogInstanceOptions = Readonly<{
  ignoreSizeLimit?: boolean
}>

/**
 * A wrapper around an object that needs to be explicitly initialized before use.
 */
export type RequiresInitialization<T> = Readonly<{
  isInitialized: () => boolean
  getInstance: () => T
  initialize: () => Promise<void>
}>

/**
 * A log object
 * @interface
 */
export type Logger = Readonly<{
  /**
   * Trace statement
   * @param message - The logs message
   * @param dataOrError - An object of data, or an object with errors.
   */
  trace: (
    message: string,
    dataOrError?: Record<string, JsonAble | object> | ErrorObject,
    options?: LogInstanceOptions
  ) => MaybePromise<void>
  /**
   * Debug statement
   * @param msg
   */
  debug: (
    message: string,
    dataOrError?: Record<string, JsonAble | object> | ErrorObject,
    options?: LogInstanceOptions
  ) => MaybePromise<void>
  /**
   * An info statement
   * @param msg
   */
  info: (
    message: string,
    dataOrError?: Record<string, JsonAble | object> | ErrorObject,
    options?: LogInstanceOptions
  ) => MaybePromise<void>
  /**
   * Warning statement
   * @param msg
   */
  warn: (
    message: string,
    dataOrError?: Record<string, JsonAble | object> | ErrorObject,
    options?: LogInstanceOptions
  ) => MaybePromise<void>
  /**
   * An error statement.
   * @param msg
   */
  error: (
    message: string,
    dataOrError?: Record<string, JsonAble | object> | ErrorObject,
    options?: LogInstanceOptions
  ) => MaybePromise<void>
  /**
   * Embeds data, so that subsequent log messages (and loggers), can log that data without having to know details about it.
   * @param data
   */
  applyData: (data: Record<string, JsonAble>) => Logger
  /**
   * Creates a logger by adding an id to the id stack.
   */
  getIdLogger: (name: string, logIdorKey: LogId | string, id?: string) => Logger
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

export type HighLevelLogger = Logger &
  Readonly<{
    getAppLogger: GetAppLogger
  }>

/**
 * A base level log object, that creates a logger
 * @interface
 */
export type RootLogger<TConfig extends Config = Config> = Readonly<{
  /**
   * Gets a logger object wrapping the components.
   * @param context - Context used for configuring a logger.
   * @param props - Any additional logging information to include with the logger.
   */
  getLogger: (
    context: CommonContext<TConfig>,
    props?: { ids?: readonly LogId[]; data?: Record<string, any> }
  ) => HighLevelLogger
}>

/**
 * A log id object.
 * @interface
 */
export type LogId = Readonly<Record<string, string>>

/**
 * A fully fleshed out log message.
 * @interface
 */
export type LogMessage<
  T extends Record<string, JsonAble> = Record<string, JsonAble>,
> = Readonly<{
  /**
   * The unique id for this log message. Every log message has a unique id.
   */
  id: string
  /**
   * The name of the logger. This is assembled from nested names joined with ':'.
   */
  logger: string
  /**
   * The environment this log was produced in.
   */
  environment: string
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
export type LogFunction = (logMessage: LogMessage) => void | Promise<void>

/**
 * A method that can do logging once given a context.
 */
export type LogMethod<TConfig extends Config = Config> = (
  context: CommonContext<TConfig>
) => LogFunction

/**
 * Core Namespaces.
 */
export enum CoreNamespace {
  root = '@node-in-layers/core',
  globals = '@node-in-layers/core/globals',
  layers = '@node-in-layers/core/layers',
  models = '@node-in-layers/core/models',
  otel = '@node-in-layers/core/otel',
}

/**
 * A generic layer
 */
export type GenericLayer = Record<string, any>

/**
 * A helpful function that can creates a PrimaryKeyProperty that operates in a standard way. This uses the CoreConfig to get the primary key property type and generator.
 * The functionality of this can be greatly overrided by creating a custom PrimaryKeyGenerator.
 */
export type PrimaryKeyPropertyGetter = <
  T extends PrimaryKeyType = PrimaryKeyType,
>(
  domain: string,
  modelPluralName: string,
  config?: DatabaseKeyPropertyConfig<T>
) => ReturnType<typeof PrimaryKeyProperty<T>>

/**
 *
 */
export type ForeignKeyPropertyGetter = <
  T extends PrimaryKeyType = PrimaryKeyType,
>(
  /**
   * The domain of the model.
   */
  domain: string,
  /**
   * The plural name of the model.
   */
  modelPluralName: string,
  /**
   * The model to use as the foreign key.
   */
  foreignKeyModel: MaybeFunction<ModelType<any>>,
  /**
   * The config for the foreign key property.
   */
  config?: Omit<DatabaseKeyPropertyConfig<T>, 'auto' | 'primaryKeyGenerator'>
) => ReturnType<typeof ForeignKeyProperty<T, DataDescription>>

/**
 * Props that go into a model constructor.
 * @interface
 */
export type ModelProps<
  TConfig extends Config = Config,
  TModelOverrides extends object = object,
  TModelInstanceOverrides extends object = object,
> = Readonly<{
  context: CommonContext<TConfig>
  Model: ModelFactory<TModelOverrides, TModelOverrides>
  fetcher: ModelInstanceFetcher<TModelOverrides, TModelInstanceOverrides>
  getPrimaryKeyProperty: PrimaryKeyPropertyGetter
  getForeignKeyProperty: ForeignKeyPropertyGetter
  getModel: <T extends DataDescription>(
    namespace: string,
    modelName: string
  ) => () => ModelType<T, TModelOverrides, TModelInstanceOverrides>
}>

/**
 * Custom model properties. getModel is provided by the framework.
 * @interface
 */
export type PartialModelProps<
  TModelOverrides extends object = object,
  TModelInstanceOverrides extends object = object,
> = Readonly<{
  Model: ModelFactory<TModelOverrides, TModelOverrides>
  fetcher: ModelInstanceFetcher<TModelOverrides, TModelInstanceOverrides>
}>

/**
 * A function that can get model props from a services context.
 * The last argument may be CrossLayerProps (same convention as LayerFunction).
 */
export type GetModelPropsFunc = (
  context: ServicesContext,
  ...args: any[]
) => PartialModelProps

/**
 * Services for the layer domain
 */
export type LayerServices = Readonly<{
  /**
   * The standard default function for getting model props
   */
  getModelProps: (context: ServicesContext) => ModelProps
  /**
   * Loads a layer.
   * @param domain
   * @param layer
   * @param existingLayers
   */
  loadLayer: (
    domain: App,
    layer: string,
    existingLayers: LayerContext
  ) => MaybePromise<GenericLayer | undefined>
}>

/**
 * The services layer for the core layers domain
 * @interface
 */
export type LayerServicesLayer = {
  /**
   * A logger for this service.
   */
  log: LayerLogger
  /**
   * Services
   */
  services: {
    [CoreNamespace.layers]: LayerServices
  }
}

export type LayerDescription = string | readonly string[]

/**
 * String model name, to either service name, or namespace, db key, and optional additional args.
 */
type ModelToModelFactoryNamespace = Record<
  string,
  string | [string, string] | [string, string, any[]]
>

/**
 * String namespace to namespace factory.
 */
type NamespaceToFactory = Record<string, ModelToModelFactoryNamespace>

/**
 * OTLP or other exporter endpoint options for OpenTelemetry.
 */
export type OtelExporterConfig = Readonly<{
  endpoint?: string
  headers?: Record<string, string>
}>

/**
 * Per-signal (trace / logs / metrics) options for OpenTelemetry.
 */
export type OtelSignalConfig = Readonly<{
  enabled?: boolean
  exporter?: OtelExporterConfig
}>

/**
 * OpenTelemetry configuration. When absent, setupOtel() is a no-op. Enable per signal via trace/logs/metrics .enabled.
 */
export type OtelConfig = Readonly<{
  /** Service name sent to OTel (e.g. systemName or app name). */
  serviceName?: string
  /** Version for the OTel resource (optional). */
  version?: string
  trace?: OtelSignalConfig
  logs?: OtelSignalConfig
  metrics?: OtelSignalConfig
  /** Shared exporter defaults (overridden by per-signal exporter). */
  exporter?: OtelExporterConfig
}>

/**
 * The core configurations
 * @interface
 */
export type CoreConfig = Readonly<{
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
    logFormat: XOR<LogFormat, ReadonlyArray<LogFormat>>
    /**
     * The maximum number of characters a log can be. NOTE: This is the count of any optional data properties,
     * and does NOT include any core fields. Defaults to 50,000
     */
    maxLogSizeInCharacters?: number
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
    /**
     * If using a function wrap with a LayerLogger, what LogLevel
     * should it be at?
     * Default: feature=info, services=trace everything else is debug
     */
    getFunctionWrapLogLevel?: (
      layerName: string,
      functionName?: string
    ) => LogLevelNames
    /**
     * Optional structure for NOT wrapping log messages around a layers function.
     * domain -> layer -> function
     *
     * You can also ignore ALL functions in a domain's layer.
     *
     * @example
     * ```javascript
     * {
     *   ignoreLayerFunctions: {
     *     '@node-in-layers/rest-api/express': {
     *       // We will ignore ALL of the express layer
     *       express: true,
     *
     *       // Ignore specific functions.
     *       features: {
     *         modelCrudsRouter: true,
     *         modelCrudsController: true,
     *       }
     *     },
     *     // This will ignore the entire layer.
     *     'myDomain.layer': true,
     *   }
     * }
     * ```
     * @interface
     */
    ignoreLayerFunctions?: Record<
      string,
      boolean | Record<string, Record<string, boolean> | boolean>
    >
    /**
     * OpenTelemetry configuration. When present, the otel domain can set up providers per signal (trace/logs/metrics). Enable per signal via .trace.enabled, .logs.enabled, .metrics.enabled.
     */
    otel?: OtelConfig
  }
  /**
   * The layers to be loaded, in their order.
   * Can be either string names for regular layers, or an array of strings, for a composite layer with multiple sub-layers.
   */
  layerOrder: readonly LayerDescription[]
  /**
   * Already loaded domains.
   * Most often take the form of doing require/imports directly in the config.
   */
  apps: readonly App[]
  /**
   * Optional: The namespace to the domain.services that has a "getModelProps()" function used for loading models
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
  /**
   * Optional: The primary key property type to use for models. Defaults to UniqueId (UUID).
   * This can/should be used to control the data type of primary keys throughout an entire system.
   * It is flexible to support changing this data type and supporting integer (SQL) in one config and uuid (NoSQL) in another.
   */
  modelIdPropertyType?: PrimaryKeyPropertyType
  /**
   * Optional: A custom primary key generator function to use for models. If the property type is UniqueId (default) then this will produce random UUID. If the property type is a number, a random number will be generated.
   * If using a SQL-like database that uses numbers, its HIGHLY recommended to get a number from the database itself.
   */
  primaryKeyGenerator?: PrimaryKeyGenerator
  /**
   * Advanced Optional: If you need to set different primary key property types depending on the model. This is useful for when you have multiple databases that need different primary keys.
   * If the model is NOT located in this record, then the modelIdPropertyType will be used.
   * This format is:
   * 'domain/PluralModelName' => PrimaryKeyPropertyType
   */
  modelNameToIdPropertyType?: Record<string, PrimaryKeyPropertyType>
  /**
   * Advanced Optional: If you need to set different primary key generators depending on the model. This is useful for when you have multiple databases that need different primary keys.
   * If the model is NOT located in this record, then the primaryKeyGenerator will be used.
   * This format is:
   * 'domain/PluralModelName' => PrimaryKeyGenerator
   */
  modelNameToPrimaryKeyGenerator?: Record<string, PrimaryKeyGenerator>
}>

/**
 * A basic config object
 * @interface
 */
export type Config = Readonly<{
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
 * A generic layer within an domain
 * @interface
 */
export type AppLayer<
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
export type CommonContext<TConfig extends Config = Config> = Readonly<{
  /**
   * The configuration file.
   */
  config: TConfig
  /**
   * A root logger.
   */
  rootLogger: RootLogger
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
export type LayerContext<
  TConfig extends Config = Config,
  TContext extends object = object,
> = CommonContext<TConfig> &
  TContext & {
    /**
     * The logger for this layer
     */
    log: LayerLogger
  }

/**
 * A context for layers that consume services. (Services and features generally)
 * @interface
 */
export type ServicesContext<
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
    services: TServices & {
      /**
       * Advanced: This function will give you any initialized services object, AFTER loadSystem has been called.
       * This is useful for situations where you need a service to be able to be configurable and access a domain AFTER this specific one has been loaded.
       * @param domain The domain name.
       * @returns The services object for the given domain
       */
      getServices: <TService extends Record<string, any>>(
        domain: string
      ) => TService | undefined
    }
  } & TContext
>

/**
 * A factory for creating the service.
 * @interface
 */
export type ServicesLayerFactory<
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
export type FeaturesContext<
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
    services: TServices & {
      /**
       * Advanced: This function will give you any initialized services object, AFTER loadSystem has been called.
       * This is useful for situations where you need a service to be able to be configurable and access a domain AFTER this specific one has been loaded.
       * This MUST be used only within a function within the layer because at load time, it will be undefined.
       * @param domain The domain name.
       * @returns The services object for the given domain
       */
      getServices: <TService extends Record<string, any>>(
        domain: string
      ) => TService | undefined
    }
    /**
     * Features
     */
    features: TFeatures & {
      /**
       * Advanced: This function will give you any initialized features object, AFTER loadSystem has been called.
       * This is useful for situations where you need a feature to be able to be configurable and access a domain AFTER this specific one has been loaded.
       * This MUST be used only within a function within the layer because at load time, it will be undefined.
       * @param domain The domain name.
       * @returns The features object for the given domain
       */
      getFeatures: <TFeature extends Record<string, any>>(
        domain: string
      ) => TFeature | undefined
    }
  } & TGlobals
>

export type FeaturesLayerFactory<
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
export type System<
  TConfig extends Config = Config,
  TServices extends object = object,
  TFeatures extends object = object,
> = CommonContext<TConfig> & {
  services: TServices
  features: TFeatures
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }

export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U

/**
 * A standardized response. Either the normal result, or an error object.
 */
export type Response<R> = XOR<R, ErrorObject>

export type TrueMaybePromise<T> = XOR<Promise<T>, T>

/**
 * Helper type to determine the correct return type
 * Response<T> for non-void; void stays void. Supports sync/async via MaybePromise.
 */
export type NilFunctionReturn<TOutput> = [TOutput] extends [void]
  ? TrueMaybePromise<void>
  : TrueMaybePromise<Response<TOutput>>

/**
 * A node in layer function. This standardized function takes all its arguments via a props object, and then it takes an optional
 * CrossLayerProps for between layer communications.
 */
export type NilFunction<
  TProps extends JsonObj,
  TOutput extends XOR<JsonObj, void>,
> = (
  props: TProps,
  crossLayerProps?: CrossLayerProps
) => NilFunctionReturn<TOutput>

/**
 * A node in layer function that has been annotated with a schema.
 * @interface
 */
export type NilAnnotatedFunction<
  TProps extends JsonObj,
  TOutput extends XOR<JsonObj, void>,
> = NilFunction<TProps, TOutput> &
  Readonly<{
    /**
     * The name of the function.
     */
    functionName: string
    /**
     * The domain the function is within.
     */
    domain: string
    /**
     * A Zod schema that describes the function
     */
    schema: z.ZodFunction<
      z.ZodTuple<[ZodType<TProps>, ZodType<CrossLayerProps | undefined>]>,
      ZodType<NilFunctionReturn<TOutput>>
    >
  }>

/**
 * The arguments to an Annotated Function
 * @interface
 */
export type AnnotatedFunctionProps<
  TProps extends JsonObj,
  TOutput extends XOR<JsonObj, void>,
> = {
  /**
   * The name of the function.
   */
  functionName: string
  /**
   * The domain the function is within.
   */
  domain: string
  /**
   * An optional description that explains how to use the function and what it does.
   */
  description?: string
  /**
   * The input arguments for the function.
   */
  args: ZodType<TProps>
  /**
   * The returns (if not a void)
   */
  returns?: ZodType<TOutput extends void ? never : TOutput>
}
