import { Config, CoreServicesLayer, CoreFeatures } from './types.js'

const create = ({ services }: CoreServicesLayer): CoreFeatures => {
  const loadSystem = async <
    TConfig extends Config,
    TFeatures extends object = object,
    TServices extends object = object,
  >(
    config?: TConfig
  ) => {
    config = config || (await services['nil-core/core'].loadConfig<TConfig>())
    const log = services['nil-core/core'].configureLogging(config)
    const logger = log.getLogger('nil-core/core.loadSystem')
    logger.debug('Loading Layers')
    const layers = services['nil-core/core'].loadLayers<
      TConfig,
      TFeatures,
      TServices
    >({
      config,
      log,
    })
    logger.trace('Modules loaded')

    return layers
  }

  return {
    loadSystem,
  }
}

export { create }
