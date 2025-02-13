import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult
} from "functional-models"
import {CrudsOptions} from "./types.js"
import merge from "lodash/merge.js"

const createModelCruds = <TData extends DataDescription>(
  model: OrmModel<TData>,
  options?: CrudsOptions<TData>
) => {
  const createFunction = (
    data: TData | ToObjectResult<TData>
  ): Promise<OrmModelInstance<TData>> => {
    // @ts-ignore
    const instance = model.create(data)
    return instance.save()
  }

  const retrieveFunction = (
    primaryKey: PrimaryKeyType
  ): Promise<OrmModelInstance<TData> | undefined> => {
    return model.retrieve(primaryKey)
  }

  /**
   *
   * @param primaryKey
   * @param data
   */
  const updateFunction = (
    primaryKey: PrimaryKeyType,
    data: TData | ToObjectResult<TData>
  ): Promise<OrmModelInstance<TData>> => {
    const pkName = model.getModelDefinition().primaryKeyName
    // @ts-ignore
    const instance = model.create(merge({[pkName]: primaryKey}, data))
    return instance.save()
  }

  const deleteFunction = (primaryKey: PrimaryKeyType): Promise<void> => {
    return model.delete(primaryKey)
  }

  const searchFunction = (
    ormSearch: OrmSearch
  ): Promise<OrmSearchResult<TData>> => {
    return model.search(ormSearch)
  }

  return {
    getModel: () => model,
    create: createFunction,
    retrieve: retrieveFunction,
    update: updateFunction,
    delete: deleteFunction,
    search: searchFunction,
    // If we have overrides this will overwrite our function
    ...(options && options.overrides ? options.overrides : {}),
  }
}

  export {
    createModelCruds,
  }
