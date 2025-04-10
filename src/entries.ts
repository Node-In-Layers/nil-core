import omit from 'lodash/omit.js'
import * as globalsApp from './globals/index.js'
import * as layersApp from './layers.js'
import { Config, CoreNamespace } from './types.js'

/**
 * Loads a node in layers system.
 * 1. Reads the configuration (if not provided).
 * 2. Loads globals
 * 3. Loads all layers
 * @param args - The required arguments.
 */
const loadSystem = async <TConfig extends Config = Config>(args: {
  environment: string
  config?: TConfig
}) => {
  const globalServices = globalsApp.services.create({
    environment: args.environment,
    workingDirectory: typeof process !== 'undefined' ? process.cwd() : '',
  })
  const globalFeatures = globalsApp.features.create({
    services: {
      [globalsApp.name]: globalServices,
    },
  })
  const globals = await globalFeatures.loadGlobals(
    args.config || args.environment
  )

  const layersServices = layersApp.services.create()
  // @ts-ignore
  const layersFeatures = layersApp.features.create({
    ...globals,
    services: {
      [layersApp.name]: layersServices,
    },
  })
  const layers = await layersFeatures.loadLayers()
  return omit(layers, [`services.${CoreNamespace.layers}`])
}

export { loadSystem }
