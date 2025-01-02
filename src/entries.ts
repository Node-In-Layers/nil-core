import omit from 'lodash/omit.js'
import * as dependenciesApp from './dependencies.js'
import * as layersApp from './layers.js'
import {
  Config,
  CoreNamespace,
  NodeDependencies,
} from './types.js'

const loadSystem = async <TConfig extends Config = Config>(args: {
  environment: string
  config?: TConfig
  nodeOverrides?: NodeDependencies
}) => {
  const depServices = dependenciesApp.services.create({
    environment: args.environment,
    workingDirectory: process.cwd(),
    nodeOverrides: args.nodeOverrides,
  })
  const depFeatures = dependenciesApp.features.create({
    services: {
      [dependenciesApp.name]: depServices,
    },
  })
  const dependencies = await depFeatures.loadDependencies(
    args.config || args.environment
  )

  const layersServices = layersApp.services.create()
  const layersFeatures = layersApp.features.create({
    ...dependencies,
    services: {
      [layersApp.name]: layersServices,
    },
  })
  const layers = layersFeatures.loadLayers()
  return omit(layers, [`services.${CoreNamespace.layers}`])
}

export { loadSystem }
