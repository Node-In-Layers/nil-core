import { RootLogger } from 'loglevel'

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

type App = Readonly<{
  name: string
  services?: ServicesDependencies<any, any>
  features?: FeaturesDependencies<any, any>
}>

enum LogFormat {
  json = 'json',
  simple = 'simple',
  full = 'full',
}

type CoreServicesProps = Readonly<{
  fs: FSLike
  environment: string
  workingDirectory: string
}>

type Config = Readonly<{
  environment: string
  'nil-core/core': {
    logLevel: LogLevelNames
    logFormat: LogFormat
    layerOrder: readonly string[]
    apps: readonly App[]
  }
}>

type CoreServices = Readonly<{
  loadConfig: <T extends Config>() => Promise<T>
  loadLayer: (app: App, layer: string, existingLayers: object) => object
  loadLayers: <
    TConfig extends Config = Config,
    TFeatures extends object = object,
    TServices extends object = object,
  >(props: {
    config: TConfig
    log: RootLogger
  }) => CoreServicesLayer & {
    services: TServices
  } & CoreFeaturesLayer & {
      features: TFeatures
    } & CommonDependencies<TConfig>
  loadApp: (appPath: string) => Promise<App>
  configureLogging: (config: Config) => RootLogger
}>

type CoreServicesLayer = Readonly<{
  services: {
    'nil-core/core': CoreServices
  }
}>

type CoreFeaturesLayer = Readonly<{
  features: {
    'nil-core/core': CoreFeatures
  }
}>

type AppLayer<
  TDependencies extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (dependencies: TDependencies) => TLayer
}>

type CommonDependencies<TConfig extends Config = Config> = Readonly<{
  fs: FSLike
  config: TConfig
  log: RootLogger
  constants: {
    environment: string
    workingDirectory: string
  }
}>

type LayerDependencies<
  TDependencies extends object = object,
  TConfig extends Config = Config,
> = CommonDependencies<TConfig> & TDependencies

type CoreFeatures = Readonly<{
  loadSystem: <
    TConfig extends Config,
    TFeatures extends object = object,
    TServices extends object = object,
  >(
    config?: TConfig
  ) => Promise<System<TConfig, TFeatures, TServices>>
}>

type ServicesDependencies<
  TDependencies extends object = object,
  TConfig extends Config = Config,
> = LayerDependencies<TDependencies, TConfig> & CoreServicesLayer

type SimpleServicesDependencies<
  TServices extends object = object,
  TConfig extends Config = Config,
> = FeaturesDependencies<object, TConfig> & {
  services: TServices
}

type FeaturesDependencies<
  TDependencies extends object = object,
  TConfig extends Config = Config,
> = LayerDependencies<TDependencies, TConfig> & CoreServicesLayer & CoreFeatures
type SimpleFeaturesDependencies<
  TServices extends object = object,
  TFeatures extends object = object,
  TConfig extends Config = Config,
> = FeaturesDependencies<object, TConfig> & {
  services: TServices
  features: TFeatures
}

type ServicesLayer<
  TDependencies extends object = object,
  TConfig extends Config = Config,
  TLayer extends object = object,
> = Readonly<{
  create: (
    dependencies: LayerDependencies<
      TDependencies & ServicesDependencies<TDependencies, TConfig>,
      TConfig
    >
  ) => TLayer
}>

type System<
  TConfig extends Config = Config,
  TFeatures extends object = object,
  TServices extends object = object,
> = CommonDependencies<TConfig> & {
  services: CoreServicesLayer & TServices
  features: CoreFeatures & TFeatures
}

export {
  CoreServices,
  Config,
  App,
  FSLike,
  CoreServicesLayer,
  LogFormat,
  LogLevel,
  LogLevelNames,
  CoreServicesProps,
  AppLayer,
  LayerDependencies,
  ServicesDependencies,
  ServicesLayer,
  FeaturesDependencies,
  CoreFeatures,
  System,
  SimpleFeaturesDependencies,
  SimpleServicesDependencies,
}
