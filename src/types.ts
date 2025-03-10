/* eslint-disable no-magic-numbers */
import {
  DataDescription,
  ModelFactory,
  ModelInstanceFetcher,
  ModelType,
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
 * A node:fs like object.
 * Useful for unit testing services that call the file system.
 * @interface
 */
type FSLike = Readonly<{
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void
  readFileSync: (path: string, encoding?: any) => string
  writeFileSync: (path: string, data: any) => void
  existsSync: (path: string) => boolean
  lstatSync: (path: string) => {
    isFile: () => boolean
    isDirectory: () => boolean
    isBlockDevice: () => boolean
    isCharacterDevice: () => boolean
    isSymbolicLink: () => boolean
    isFIFO: () => boolean
    isSocket: () => boolean
  }
}>

/**
 * The format of log messages to the console.
 */
enum LogFormat {
  json = 'json',
  custom = 'custom',
  simple = 'simple',
  full = 'full',
}

/**
 * A log object
 * @interface
 */
type Logger = Readonly<{
  /**
   * Trace statement
   * @param msg
   */
  trace: (message: string, dataOrError?: object) => void
  /**
   * Debug statement
   * @param msg
   */
  debug: (message: string, dataOrError?: object) => void
  /**
   * An info statement
   * @param msg
   */
  info: (message: string, dataOrError?: object) => void
  /**
   * Warning statement
   * @param msg
   */
  warn: (message: string, dataOrError?: object) => void
  /**
   * An error statement.
   * @param msg
   */
  error: (message: string, dataOrError?: object) => void
}>

/**
 * A base level log object, that creates a logger
 * @interface
 */
type RootLogger = Readonly<{
  /**
   * Gets a logger object wrapping the components.
   * @param name - The name of the component doing the logging. Could be an app, a function, etc.
   */
  getLogger: (name: string) => Logger
}>

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
  [CoreNamespace.root]: {
    /**
     * The log level to log at.
     */
    logLevel: LogLevelNames
    /**
     * The format of log messages to the console.
     */
    logFormat: LogFormat
    logMethod: (props: {
      methodName: string
      logLevel: LogLevel
      loggerName: string
      datetime: Date
      message: string
      data?: object
    }) => void | Promise<void>
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
  }
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
 * Node dependencies.
 * @interface
 */
type NodeDependencies = Readonly<{
  fs: FSLike
}>

/**
 * The base level context that everything recieves.
 * @interface
 */
type CommonContext<TConfig extends Config = Config> = Readonly<{
  /**
   * Node dependencies
   */
  node: NodeDependencies
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
  FSLike,
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
  NodeDependencies,
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
}
