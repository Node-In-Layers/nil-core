import get from 'lodash/get.js'
import flatten from 'lodash/flatten.js'
import omit from 'lodash/omit.js'
import merge from 'lodash/merge.js'
import { DataDescription, Model, ModelType } from 'functional-models'
import {
  App,
  AppLayer,
  AppLogger,
  CommonContext,
  CoreNamespace,
  FeaturesContext,
  GenericLayer,
  GetModelPropsFunc,
  LayerContext,
  LayerServices,
  LayerServicesLayer,
  MaybePromise,
  ModelConstructor,
  PartialModelProps,
  ServicesContext,
} from './types.js'
import { DoNothingFetcher, getLayersUnavailable } from './libs.js'
import { memoizeValueSync } from './utils.js'
import { createModelCruds } from './models/libs.js'
import { ModelCrudsFunctions } from './models/types.js'

const name = CoreNamespace.layers

const modelGetter = <
  TModelOverrides extends object = object,
  TModelInstanceOverrides extends object = object,
>(
  apps: readonly App[],
  modelProps: PartialModelProps
) => {
  const memoized = {}
  // We have to create a self reference, so we have to set this to null, and then overwrite it.
  // @ts-ignore
  // eslint-disable-next-line functional/no-let
  let getModel: (namespace: string, modelName: string) => any = null
  getModel = <T extends DataDescription>(
    namespace: string,
    modelName: string
  ) => {
    const app = apps.find(a => a.name === namespace)
    if (!app || !app.models) {
      throw new Error(
        `An app with models does not exist for namespace ${namespace}`
      )
    }

    const models = app.models
    const modelConstructor = models[modelName]
    if (!modelConstructor) {
      throw new Error(
        `A model named ${modelName} does not exist for namespace ${namespace}`
      )
    }
    if (!(namespace in memoized)) {
      // We are doing a memoized state so we need this
      // eslint-disable-next-line functional/immutable-data
      memoized[namespace] = {}
    }
    if (!(modelName in memoized)) {
      const func = memoizeValueSync(() =>
        modelConstructor.create<T, TModelOverrides, TModelInstanceOverrides>({
          ...modelProps,
          getModel,
        })
      )
      // We are doing a memoized state so we need this
      // eslint-disable-next-line functional/immutable-data
      memoized[namespace][modelName] = func
    }
    return memoized[namespace][modelName]
  }
  return getModel
}

const services = {
  create: (): LayerServices => {
    const getModelProps = <
      TModelOverrides extends object = object,
      TModelInstanceOverrides extends object = object,
    >(
      context: ServicesContext
    ) => {
      const fetcher = DoNothingFetcher
      const modelGetterInstance = modelGetter<
        TModelOverrides,
        TModelInstanceOverrides
      >(context.config[CoreNamespace.root].apps, { Model, fetcher })
      return {
        Model,
        fetcher,
        getModel: modelGetterInstance,
      }
    }

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
      getModelProps,
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

    const _getModelLoadedContext = (
      app: App,
      currentLayer: string,
      layerContext: LayerContext
    ): LayerContext => {
      if (app.models) {
        // If this is services, we need to load models first if they exist
        if (currentLayer === 'services') {
          const mfNamespace =
            context.config['@node-in-layers/core'].modelFactory ||
            CoreNamespace.layers
          const customMf =
            context.config['@node-in-layers/core'].customModelFactory || {}
          const defaultMf =
            // @ts-ignore
            layerContext.services[mfNamespace] || context.services[mfNamespace]
          if (!defaultMf) {
            throw new Error(
              `Namespace ${mfNamespace} does not have a services object`
            )
          }
          if (!defaultMf.getModelProps) {
            throw new Error(
              `Namespace ${mfNamespace} does not have a services object with a getModelProps(context: ServicesContext) function`
            )
          }
          const models: Record<string, ModelConstructor> = app.models
          // This function is added to the services context.
          const getModels = memoizeValueSync(() => {
            const defaultModelProps = defaultMf.getModelProps(layerContext)
            const modelsObj = Object.entries(models).reduce(
              (acc, [modelName, constructor]) => {
                // Do we have a custom model props for this?
                const custom = get(customMf, `${app.name}.${modelName}`)
                const isCustomArray = Array.isArray(custom)
                const customArgs = isCustomArray ? custom.slice(1) : []
                const customModelProps = custom
                  ? isCustomArray
                    ? get(layerContext, `services[${custom[0]}].getModelProps`)
                    : get(layerContext, `services[${custom}].getModelProps`)
                  : undefined
                if (custom && !customModelProps) {
                  throw new Error(
                    `Configuration requires that Model named ${modelName} receive a model props from ${custom}`
                  )
                }
                const modelProps = customModelProps
                  ? (customModelProps as GetModelPropsFunc)(
                      layerContext as ServicesContext,
                      ...customArgs
                    )
                  : defaultModelProps
                if (!constructor.create) {
                  throw new Error(
                    'Model constructor must have a create function'
                  )
                }

                const getModel = modelGetter(
                  context.config['@node-in-layers/core'].apps,
                  modelProps
                )

                const instance = constructor.create({
                  ...modelProps,
                  getModel,
                })
                return merge(acc, {
                  [modelName]: instance,
                })
              },
              {} as Record<string, ModelType<any>>
            )
            return modelsObj
          })

          const serviceCruds = context.config['@node-in-layers/core'].modelCruds
            ? Object.keys(models).reduce((acc, name) => {
                return merge(acc, {
                  [name]: createModelCruds(() => getModels()[name]),
                })
              }, {})
            : undefined

          return merge(
            {},
            layerContext,
            serviceCruds
              ? {
                  services: {
                    [app.name]: {
                      cruds: serviceCruds,
                    },
                  },
                }
              : {},
            {
              models: {
                [app.name]: {
                  getModels,
                },
              },
            }
          )
        } else if (
          currentLayer === 'features' &&
          context.config['@node-in-layers/core'].modelCruds
        ) {
          // We need to add the feature wrappers over service level wrappers.
          const serviceWrappers: [string, ModelCrudsFunctions<any>][] =
            // @ts-ignore
            Object.entries(get(layerContext, `services.${app.name}.cruds`, {}))
          // @ts-ignore
          const featureWrappers = serviceWrappers.reduce(
            (acc, [name, cruds]) => {
              return merge(acc, {
                [name]: createModelCruds<any>(() => cruds.getModel(), {
                  overrides: cruds,
                }),
              })
            },
            {}
          )

          return merge({}, layerContext, {
            features: {
              [app.name]: {
                cruds: featureWrappers,
              },
            },
          })
        }
      }
      return layerContext
    }

    const _loadLayer = async (
      app: App,
      appLogger: AppLogger,
      currentLayer: string,
      commonContext: LayerContext,
      previousLayer: LayerRecord | undefined
    ): Promise<LayerRecord> => {
      const layerLogger = appLogger.getLayerLogger(currentLayer)
      const layerContext = _getModelLoadedContext(
        app,
        currentLayer,
        Object.assign({}, _getLayerContext(commonContext, previousLayer), {
          log: layerLogger,
        })
      )
      const layer = context.services[CoreNamespace.layers].loadLayer(
        app,
        currentLayer,
        layerContext
      )
      if (!layer) {
        return {}
      }
      return merge(
        {
          [currentLayer]: {
            [app.name]: isPromise<GenericLayer>(layer) ? await layer : layer,
          },
        },
        layerContext
      )
    }

    const _loadCompositeLayer = async (
      app: App,
      appLogger: AppLogger,
      currentLayer: readonly string[],
      commonContext: LayerContext,
      previousLayer: LayerRecord | undefined,
      antiLayers: (layer: string) => readonly string[]
    ): Promise<LayerRecord> => {
      return currentLayer.reduce(async (previousSubLayersP, layer) => {
        const previousSubLayers = isPromise(previousSubLayersP)
          ? await previousSubLayersP
          : previousSubLayersP
        const layersToRemove = antiLayers(layer)
        const layerLogger = appLogger.getLayerLogger(layer)
        // We need common context PLUS the previous layers.
        const theContext = omit(
          merge({}, commonContext, previousSubLayers, { log: layerLogger }),
          layersToRemove
        )
        // @ts-ignore
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
        const result = merge({}, previousSubLayers, {
          [layer]: {
            [app.name]: isPromise(loadedLayer)
              ? await loadedLayer
              : loadedLayer,
          },
        })
        return result
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
          const appLogger = context.rootLogger
            .getLogger(context)
            .getAppLogger(app.name)
          const result = await layersInOrder.reduce<Promise<R>>(
            async (accP, layer): Promise<R> => {
              const acc = await accP
              const [existingLayers2, previousLayer] = acc
              const layersToRemove = Array.isArray(layer)
                ? // Remove the composite layers from the anti-layers, this will be handled in the composite layer
                  flatten(layer.map(antiLayers)).filter(
                    x => layer.find(y => x === y) === false
                  )
                : antiLayers(layer as string)

              // We have to remove existing layers that we don't want to be exposed.
              const correctContext = omit(
                existingLayers,
                layersToRemove
              ) as LayerContext
              const layerInstance = await (Array.isArray(layer)
                ? _loadCompositeLayer(
                    app,
                    appLogger,
                    layer as string[],
                    correctContext,
                    previousLayer,
                    antiLayers
                  )
                : _loadLayer(
                    app,
                    appLogger,
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
