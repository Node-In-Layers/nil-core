/* eslint-disable no-magic-numbers */
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  SILENT = 5,
}
/* eslint-enable no-magic-numbers */

enum LogLevelNames {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
  silent = 'silent',
}

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

enum LogFormat {
  json = 'json',
  simple = 'simple',
  full = 'full',
}

type Logger = Readonly<{
  trace: (...msg: any[]) => void
  debug: (...msg: any[]) => void
  log: (...msg: any[]) => void
  info: (...msg: any[]) => void
  warn: (...msg: any[]) => void
  error: (...msg: any[]) => void
}>

type RootLogger = Readonly<{
  getLogger: (name: string) => Logger
}>

enum CoreNamespace {
  root = '@node-in-layers/core',
  dependencies = '@node-in-layers/core/dependencies',
  layers = '@node-in-layers/core/layers',
}

type Config = Readonly<{
  environment: string
  [CoreNamespace.root]: {
    logLevel: LogLevelNames
    logFormat: LogFormat
    layerOrder: readonly string[]
    apps: readonly App[]
  }
}>

type AppLayer<
  TConfig extends Config = Config,
  TDependencies extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (dependencies: LayerDependencies<TConfig, TDependencies>) => TLayer
}>

type CommonDependencies<TConfig extends Config = Config> = Readonly<{
  node: {
    fs: FSLike
  }
  config: TConfig
  log: RootLogger
  constants: {
    environment: string
    workingDirectory: string
  }
}>

type LayerDependencies<
  TConfig extends Config = Config,
  TDependencies extends object = object,
> = CommonDependencies<TConfig> & TDependencies

type ServicesDependencies<
  TConfig extends Config = Config,
  TServices extends object = object,
  TDependencies extends object = object,
> = LayerDependencies<
  TConfig,
  {
    services: TServices
  } & TDependencies
>

type ServicesLayer<
  TConfig extends Config = Config,
  TServices extends object = object,
  TDependencies extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (
    dependencies: ServicesDependencies<TConfig, TServices, TDependencies>
  ) => TLayer
}>

type DependenciesLayer<
  TConfig extends Config = Config,
  TDependencies extends object = object,
> = Readonly<{
  create: (deps: CommonDependencies<TConfig>) => Promise<TDependencies>
}>

type FeaturesDependencies<
  TConfig extends Config = Config,
  TServices extends object = object,
  TFeatures extends object = object,
  TDependencies extends object = object,
> = LayerDependencies<
  TConfig,
  {
    services: TServices
    features: TFeatures
  } & TDependencies
>

type FeaturesLayer<
  TConfig extends Config = Config,
  TDependencies extends object = object,
  TServices extends object = object,
  TFeatures extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (
    dependencies: FeaturesDependencies<
      TConfig,
      TServices,
      TFeatures,
      TDependencies
    >
  ) => TLayer
}>

type System<
  TConfig extends Config = Config,
  TFeatures extends object = object,
  TServices extends object = object,
> = CommonDependencies<TConfig> & {
  services: TServices
  features: TFeatures
}

type DependenciesServicesProps = Readonly<{
  environment: string
  workingDirectory: string
}>

type DependenciesServices<TConfig extends Config> = Readonly<{
  loadConfig: () => Promise<TConfig>
  configureLogging: (config: TConfig) => RootLogger
  getConstants: () => {
    workingDirectory: string
    environment: string
  }
  getNodeServices: () => {
    fs: FSLike
  }
  getDependencies: (
    commonDependencies: CommonDependencies<TConfig>,
    app: App
  ) => Promise<Record<string, any>>
}>

type DependenciesFeatures<TConfig extends Config> = Readonly<{
  loadDependencies: <TDependencies extends Record<string, any> = object>(
    environmentOrConfig: string | TConfig
  ) => Promise<CommonDependencies<TConfig> & TDependencies>
}>

type App = Readonly<{
  name: string
  services?: AppLayer<Config, any>
  features?: AppLayer<Config, any>
  dependencies?: DependenciesLayer<Config, any>
}>

type LayerServices = Readonly<{
  loadLayer: (
    app: App,
    layer: string,
    existingLayers: object
  ) => undefined | Record<string, any>
}>

type LayerServicesLayer = {
  services: {
    [CoreNamespace.layers]: LayerServices
  }
}

export {
  Config,
  App,
  FSLike,
  LogFormat,
  LogLevel,
  LogLevelNames,
  AppLayer,
  LayerDependencies,
  ServicesDependencies,
  ServicesLayer,
  FeaturesDependencies,
  System,
  DependenciesServices,
  DependenciesServicesProps,
  DependenciesFeatures,
  CommonDependencies,
  LayerServices,
  LayerServicesLayer,
  CoreNamespace,
  FeaturesLayer,
  Logger,
}
