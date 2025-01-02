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
  Namespaces,
} from './types.js'
import { getLayersUnavailable } from './libs.js'

const name = Namespaces.layers

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
      const layersInOrder = props.config[Namespaces.core].layerOrder
      const antiLayers = getLayersUnavailable(layersInOrder)
      const ignoreLayers = [Namespaces.layers, Namespaces.dependencies]
        .map(l => `services.${l}`)
        .concat(
          [Namespaces.layers, Namespaces.dependencies].map(l => `features.${l}`)
        )
      return omit(
        props.config[Namespaces.core].apps.reduce(
          (existingLayers: LayerDependencies, app) => {
            return layersInOrder.reduce(
              (existingLayers2: LayerDependencies, layer) => {
                // We have to remove existing layers that we don't want to be exposed.
                const correctContext = omit(existingLayers, [
                  ...antiLayers(layer),
                  ...ignoreLayers,
                ])
                const instance = props.services[Namespaces.layers].loadLayer(
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
