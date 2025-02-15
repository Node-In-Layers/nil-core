import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult,
} from 'functional-models'
import merge from 'lodash/merge.js'
import { memoizeValueSync } from '../utils.js'
import { CrudsOptions, ModelCrudsFunctions } from './types.js'

/**
 * Creates Model Cruds for a given model.
 * @param model - The model to wrap
 * @param options - Additional options and overrides
 */
const createModelCruds = <TData extends DataDescription>(
  model: OrmModel<TData> | (() => OrmModel<TData>),
  options?: CrudsOptions<TData>
): ModelCrudsFunctions<TData> => {
  const _getModel = memoizeValueSync((): OrmModel<TData> => {
    if (typeof model === 'function') {
      return model()
    }
    return model
  })

  const createFunction = (
    data: TData | ToObjectResult<TData>
  ): Promise<OrmModelInstance<TData>> => {
    // @ts-ignore
    const instance = _getModel().create(data)
    return instance.save()
  }

  const retrieveFunction = (
    primaryKey: PrimaryKeyType
  ): Promise<OrmModelInstance<TData> | undefined> => {
    return _getModel().retrieve(primaryKey)
  }

  const updateFunction = (
    primaryKey: PrimaryKeyType,
    data: TData | ToObjectResult<TData>
  ): Promise<OrmModelInstance<TData>> => {
    const pkName = _getModel().getModelDefinition().primaryKeyName
    // @ts-ignore
    const instance = model.create(merge({ [pkName]: primaryKey }, data))
    return instance.save()
  }

  const deleteFunction = (primaryKey: PrimaryKeyType): Promise<void> => {
    return _getModel().delete(primaryKey)
  }

  const searchFunction = (
    ormSearch: OrmSearch
  ): Promise<OrmSearchResult<TData>> => {
    return _getModel().search(ormSearch)
  }

  return {
    getModel: _getModel,
    create: createFunction,
    retrieve: retrieveFunction,
    update: updateFunction,
    delete: deleteFunction,
    search: searchFunction,
    // If we have overrides this will overwrite our function
    ...(options && options.overrides ? options.overrides : {}),
  }
}

export { createModelCruds }
