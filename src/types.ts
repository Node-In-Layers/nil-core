/* eslint-disable no-magic-numbers */
import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult,
} from 'functional-models'

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
  trace: (...msg: any[]) => void
  /**
   * Debug statement
   * @param msg
   */
  debug: (...msg: any[]) => void
  /**
   * An info statement
   * @param msg
   */
  info: (...msg: any[]) => void
  /**
   * Warning statement
   * @param msg
   */
  warn: (...msg: any[]) => void
  /**
   * An error statement.
   * @param msg
   */
  error: (...msg: any[]) => void
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
 * Services for the layer app
 */
type LayerServices = Readonly<{
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
 * The context for a service
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
 * A context for layers
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
}>

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
}
