import { DataDescription, OrmModel } from 'functional-models'
import { Config, FeaturesContext } from '@node-in-layers/core'
import {
  CrudsOptions,
  ModelServicesLayer,
  ModelsFeaturesLayer,
} from './types.js'

const create = (
  context: FeaturesContext<Config, ModelServicesLayer>
): ModelsFeaturesLayer => {
  const createModelCruds = <TData extends DataDescription>(
    model: OrmModel<TData>,
    options?: CrudsOptions<TData>
  ) => {
    return context.services[
      '@node-in-layers/core/models'
    ].createModelCruds<TData>(model, options)
  }
  return {
    createModelCruds,
  }
}

export { create }
