import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult,
} from 'functional-models'
import { Config, ServicesContext } from '../types.js'

/**
 * The CRUDS functions for a model
 * @interface
 */
type ModelCrudsFunctions<
  TData extends DataDescription,
  TModelExtensions extends object = object,
  TModelInstanceExtensions extends object = object,
> = Readonly<{
  /**
   * Gets the underlying model
   */
  getModel: () => OrmModel<TData, TModelExtensions, TModelInstanceExtensions>
  /**
   * The create function
   */
  create: CreateFunction<TData>
  /**
   * The retrieve function
   */
  retrieve: RetrieveFunction<TData>
  /**
   * The update function
   */
  update: UpdateFunction<TData>
  /**
   * The delete function
   */
  delete: DeleteFunction
  /**
   * The search function
   */
  search: SearchFunction<TData>
}>

/**
 * Core Model Services
 */
type ModelServices = Readonly<{
  /**
   * Creates service level CRUDS functions for a model.
   * @param model - The model.
   * @param options
   */
  createModelCruds: <TData extends DataDescription>(
    model: OrmModel<TData>,
    options?: CrudsOptions<TData>
  ) => ModelCrudsFunctions<TData>
}>

/**
 * A function that creates
 */
type CreateFunction<TData extends DataDescription> = (
  data: TData | ToObjectResult<TData>
) => Promise<OrmModelInstance<TData>>

/**
 * A function that retrieves
 */
type RetrieveFunction<TData extends DataDescription> = (
  primaryKey: PrimaryKeyType
) => Promise<OrmModelInstance<TData> | undefined>

/**
 * A function that updates
 */
type UpdateFunction<TData extends DataDescription> = (
  primaryKey: PrimaryKeyType,
  data: TData | ToObjectResult<TData>
) => Promise<OrmModelInstance<TData>>

/**
 * A function that deletes
 */
type DeleteFunction = (primaryKey: PrimaryKeyType) => Promise<void>

/**
 * A function that searches.
 */
type SearchFunction<TData extends DataDescription> = (
  ormSearch: OrmSearch
) => Promise<OrmSearchResult<TData>>

/**
 * An object that provides overrides for default behavior.
 * @interface
 */
type CrudsOverrides<TData extends DataDescription> = Partial<
  Omit<ModelCrudsFunctions<TData>, 'getModel'>
>

/**
 * Options for building CRUDS interfaces with a model
 * @interface
 */
type CrudsOptions<TData extends DataDescription> = Readonly<{
  /**
   * Override any individual function.
   */
  overrides?: CrudsOverrides<TData>
}>

/**
 * A services context, that exposes CRUDS models services.
 */
type ModelCrudsServicesContext<
  TModels extends Record<string, ModelCrudsFunctions<any>>,
  TConfig extends Config = Config,
  TServices extends object = object,
  TContext extends object = object,
> = ServicesContext<
  TConfig,
  TServices & {
    cruds: TModels
  },
  TContext
>

export {
  UpdateFunction,
  DeleteFunction,
  SearchFunction,
  CreateFunction,
  CrudsOptions,
  RetrieveFunction,
  ModelCrudsFunctions,
  ModelServices,
  CrudsOverrides,
  ModelCrudsServicesContext,
}
