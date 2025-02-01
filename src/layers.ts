import get from 'lodash/get.js'
import flatten from 'lodash/flatten.js'
import omit from 'lodash/omit.js'
import merge from 'lodash/merge.js'
import {
  App,
  AppLayer,
  LayerContext,
  CommonContext,
  CoreNamespace,
  MaybePromise,
  FeaturesContext,
  LayerServices,
  GenericLayer,
  LayerServicesLayer,
} from './types.js'
import { getLayersUnavailable } from './libs.js'

const name = CoreNamespace.layers

const services = {
  create: (): LayerServices => {
    const loadLayer = (
      app: App,
      layer: string,
      context: LayerContext
    ): MaybePromise<GenericLayer | undefined> => {
      const constructor: AppLayer<any, any> | undefined = get(app, `${layer}`)
      if (!constructor?.create) {
        return undefined
      }
      const instance = constructor.create(context)
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

const isPromise = <T>(t: any): t is Promise<T> => {
  if (!t) {
    return false
  }
  return Boolean(t.then)
}

const features = {
  create: (context: CommonContext & LayerServicesLayer) => {
    type LayerRecord = Record<string, Record<string, object>>

    const _getLayerContext = (
      commonContext: LayerContext,
      layer: LayerRecord | undefined
    ) => {
      if (layer) {
        return merge({}, commonContext, layer)
      }
      return commonContext
    }

    const _loadLayer = async (
      app: App,
      currentLayer: string,
      commonContext: LayerContext,
      previousLayer: LayerRecord | undefined
    ): Promise<LayerRecord> => {
      const layerContext = _getLayerContext(commonContext, previousLayer)
      const layer = context.services[CoreNamespace.layers].loadLayer(
        app,
        currentLayer,
        layerContext
      )
      if (!layer) {
        return {}
      }
      return {
        [currentLayer]: {
          [app.name]: isPromise<GenericLayer>(layer) ? await layer : layer,
        },
      }
    }

    const _loadCompositeLayer = async (
      app: App,
      currentLayer: readonly string[],
      commonContext: LayerContext,
      previousLayer: LayerRecord | undefined
    ): Promise<LayerRecord> => {
      return currentLayer.reduce(async (previousSubLayersP, layer) => {
        const previousSubLayers = isPromise(previousSubLayersP)
          ? await previousSubLayersP
          : previousSubLayersP
        // We need common context PLUS the previous layers.
        const theContext = merge({}, commonContext, previousSubLayers)
        const layerContext = _getLayerContext(theContext, previousLayer)
        const loadedLayer = context.services[CoreNamespace.layers].loadLayer(
          app,
          layer,
          layerContext
        )
        if (!loadedLayer) {
          return previousSubLayers
        }
        // We have to create a NEW context to be passed along each time. If we put acc as the first arg, all the other sub-layers will magically get things they can't have.
        return merge({}, previousSubLayers, {
          [layer]: {
            [app.name]: isPromise(loadedLayer)
              ? await loadedLayer
              : loadedLayer,
          },
        })
      }, {})
    }

    const loadLayers = (): Promise<FeaturesContext> => {
      const layersInOrder = context.config[CoreNamespace.root].layerOrder
      const antiLayers = getLayersUnavailable(layersInOrder)
      const coreLayersToIgnore = [CoreNamespace.layers, CoreNamespace.globals]
        .map(l => `services.${l}`)
        .concat(
          [CoreNamespace.layers, CoreNamespace.globals].map(
            l => `features.${l}`
          )
        )
      const startingContext = omit(context, coreLayersToIgnore) as CommonContext

      // @ts-ignore
      return context.config[CoreNamespace.root].apps.reduce<
        Promise<FeaturesContext>
      >(
        async (existingLayersP, app): Promise<FeaturesContext> => {
          const existingLayers = await existingLayersP
          type R = [LayerContext, LayerRecord]
          const result = await layersInOrder.reduce<Promise<R>>(
            async (accP, layer): Promise<R> => {
              const acc = await accP
              const [existingLayers2, previousLayer] = acc
              const layersToRemove = Array.isArray(layer)
                ? flatten(layer.map(antiLayers))
                : antiLayers(layer as string)

              // We have to remove existing layers that we don't want to be exposed.
              const correctContext = omit(
                existingLayers,
                layersToRemove
              ) as LayerContext
              const layerInstance = await (Array.isArray(layer)
                ? _loadCompositeLayer(
                    app,
                    layer as string[],
                    correctContext,
                    previousLayer
                  )
                : _loadLayer(
                    app,
                    layer as string,
                    correctContext,
                    previousLayer
                  ))
              if (!layerInstance) {
                return [existingLayers2, {}]
              }
              const newContext: LayerContext = merge(
                {},
                existingLayers2,
                layerInstance
              )
              return [newContext, layerInstance as LayerRecord]
            },
            Promise.resolve([existingLayers, {}]) as Promise<
              [LayerContext, LayerRecord]
            >
          )
          return result[0] as FeaturesContext
        },
        Promise.resolve(startingContext) as Promise<FeaturesContext>
      ) as Promise<FeaturesContext>
    }
    return {
      loadLayers,
    }
  },
}

export { name, services, features }
