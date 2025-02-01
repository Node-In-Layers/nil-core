import omit from 'lodash/omit.js'
import * as globalsApp from './globals.js'
import * as layersApp from './layers.js'
import { Config, CoreNamespace, NodeDependencies } from './types.js'

const loadSystem = async <TConfig extends Config = Config>(args: {
  environment: string
  config?: TConfig
  nodeOverrides?: NodeDependencies
}) => {
  const globalServices = globalsApp.services.create({
    environment: args.environment,
    workingDirectory: process.cwd(),
    nodeOverrides: args.nodeOverrides,
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
