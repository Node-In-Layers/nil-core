import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import merge from 'lodash/merge.js'
import {
  App,
  AppLayer,
  LayerContext,
  CommonContext,
  CoreNamespace,
} from './types.js'
import { getLayersUnavailable } from './libs.js'

const name = CoreNamespace.layers

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

const services = {
  create: (): LayerServices => {
    const loadLayer = (app: App, layer: string, existingLayers: object) => {
      const constructor: AppLayer<any, any> | undefined = get(app, `${layer}`)
      if (!constructor?.create) {
        return undefined
      }
      const instance = constructor.create(existingLayers)
      if (!instance) {
        throw new Error(
          `App ${app.name} did not return an instance layer ${layer}`
        )
      }
      return instance
    }

    return {
      loadLayer,
    }
  },
}

const features = {
  create: (context: CommonContext & LayerServicesLayer) => {
    const loadLayers = () => {
      const layersInOrder = context.config[CoreNamespace.root].layerOrder
      const antiLayers = getLayersUnavailable(layersInOrder)
      const ignoreLayers = [CoreNamespace.layers, CoreNamespace.dependencies]
        .map(l => `services.${l}`)
        .concat(
          [CoreNamespace.layers, CoreNamespace.dependencies].map(
            l => `features.${l}`
          )
        )
      return omit(
        context.config[CoreNamespace.root].apps.reduce(
          (existingLayers: LayerContext, app) => {
            return layersInOrder.reduce(
              (existingLayers2: LayerContext, layer) => {
                // We have to remove existing layers that we don't want to be exposed.
                const correctContext = omit(existingLayers, [
                  ...antiLayers(layer),
                  ...ignoreLayers,
                ])
                const instance = context.services[
                  CoreNamespace.layers
                ].loadLayer(app, layer, correctContext)
                if (!instance) {
                  return existingLayers2
                }
                // NOTE: This kind of merge, is not immutable, but it's fast.
                return merge(existingLayers2, {
                  [layer]: {
                    [app.name]: instance,
                  },
                })
              },
              existingLayers
            )
          },
          context
        ),
        ignoreLayers
      )
    }
    return {
      loadLayers,
    }
  },
}

export { name, services, features }
