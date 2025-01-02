import get from 'lodash/get.js'
import omit from 'lodash/omit.js'
import merge from 'lodash/merge.js'
import {
  App,
  AppLayer,
  LayerDependencies,
  CommonDependencies,
  LayerServices,
  LayerServicesLayer,
  CoreNamespace,
} from './types.js'
import { getLayersUnavailable } from './libs.js'

const name = CoreNamespace.layers

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
  create: (props: CommonDependencies & LayerServicesLayer) => {
    const loadLayers = () => {
      const layersInOrder = props.config[CoreNamespace.root].layerOrder
      const antiLayers = getLayersUnavailable(layersInOrder)
      const ignoreLayers = [CoreNamespace.layers, CoreNamespace.dependencies]
        .map(l => `services.${l}`)
        .concat(
          [CoreNamespace.layers, CoreNamespace.dependencies].map(
            l => `features.${l}`
          )
        )
      return omit(
        props.config[CoreNamespace.root].apps.reduce(
          (existingLayers: LayerDependencies, app) => {
            return layersInOrder.reduce(
              (existingLayers2: LayerDependencies, layer) => {
                // We have to remove existing layers that we don't want to be exposed.
                const correctContext = omit(existingLayers, [
                  ...antiLayers(layer),
                  ...ignoreLayers,
                ])
                const instance = props.services[CoreNamespace.layers].loadLayer(
                  app,
                  layer,
                  correctContext
                )
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
          props
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
