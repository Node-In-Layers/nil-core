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
  create: (dependencies: LayerContext<TConfig, TDependencies>) => TLayer
}>

type NodeDependencies = Readonly<{
  fs: FSLike
}>

type CommonContext<TConfig extends Config = Config> = Readonly<{
  node: NodeDependencies
  config: TConfig
  log: RootLogger
  constants: {
    environment: string
    workingDirectory: string
  }
}>

type LayerContext<
  TConfig extends Config = Config,
  TDependencies extends object = object,
> = CommonContext<TConfig> & TDependencies

type ServicesContext<
  TConfig extends Config = Config,
  TServices extends object = object,
  TDependencies extends object = object,
> = LayerContext<
  TConfig,
  {
    services: TServices
  } & TDependencies
>

type ServicesLayerFactory<
  TConfig extends Config = Config,
  TServices extends object = object,
  TDependencies extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (
    context: ServicesContext<TConfig, TServices, TDependencies>
  ) => TLayer
}>

type DependenciesLayer<
  TConfig extends Config = Config,
  TDependencies extends object = object,
> = Readonly<{
  create: (context: CommonContext<TConfig>) => Promise<TDependencies>
}>

type FeaturesContext<
  TConfig extends Config = Config,
  TServices extends object = object,
  TFeatures extends object = object,
  TDependencies extends object = object,
> = LayerContext<
  TConfig,
  {
    services: TServices
    features: TFeatures
  } & TDependencies
>

type FeaturesLayerFactory<
  TConfig extends Config = Config,
  TDependencies extends object = object,
  TServices extends object = object,
  TFeatures extends object = object,
  TLayer extends object = object,
> = Readonly<{
  create: (
    context: FeaturesContext<TConfig, TServices, TFeatures, TDependencies>
  ) => TLayer
}>

type System<
  TConfig extends Config = Config,
  TFeatures extends object = object,
  TServices extends object = object,
> = CommonContext<TConfig> & {
  services: TServices
  features: TFeatures
}

type App = Readonly<{
  name: string
  services?: AppLayer<Config, any>
  features?: AppLayer<Config, any>
  dependencies?: DependenciesLayer<Config, any>
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
}
