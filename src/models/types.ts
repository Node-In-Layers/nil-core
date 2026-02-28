import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult,
} from 'functional-models'

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
  /**
   * The bulk insert function
   */
  bulkInsert: BulkInsertFunction<TData>
  /**
   * The bulk delete function
   */
  bulkDelete: BulkDeleteFunction
}>

/**
 * Core model services providing CRUDS factory functionality.
 * @interface
 */
type ModelServices = Readonly<{
  /**
   * Creates service-level {@link ModelCrudsFunctions} for an ORM model.
   * @param model - The ORM model to build CRUDS functions for.
   * @param options - Optional {@link CrudsOptions} to override individual functions.
   */
  createModelCruds: <TData extends DataDescription>(
    model: OrmModel<TData>,
    options?: CrudsOptions<TData>
  ) => ModelCrudsFunctions<TData>
}>

/**
 * Creates a new model instance and persists it via the ORM.
 * Accepts either partial data (with ignored properties) or a fully serialized object.
 */
type CreateFunction<TData extends DataDescription> = <
  IgnoreProperties extends string = '',
>(
  data: Omit<TData, IgnoreProperties> | ToObjectResult<TData>
) => Promise<OrmModelInstance<TData>>

/**
 * Retrieves a model instance by its primary key. Returns `undefined` if not found.
 */
type RetrieveFunction<TData extends DataDescription> = (
  primaryKey: PrimaryKeyType
) => Promise<OrmModelInstance<TData> | undefined>

/**
 * Updates an existing model instance identified by its primary key and persists the changes.
 */
type UpdateFunction<TData extends DataDescription> = (
  primaryKey: PrimaryKeyType,
  data: TData | ToObjectResult<TData>
) => Promise<OrmModelInstance<TData>>

/**
 * Deletes a model instance by its primary key.
 */
type DeleteFunction = (primaryKey: PrimaryKeyType) => Promise<void>

/**
 * Searches for model instances matching the given {@link OrmSearch} query.
 */
type SearchFunction<TData extends DataDescription> = (
  ormSearch: OrmSearch
) => Promise<OrmSearchResult<TData>>

/**
 * A function that bulk inserts
 */
type BulkInsertFunction<TData extends DataDescription> = (
  data: readonly TData[]
) => Promise<void>

/**
 * A function that bulk deletes
 */
type BulkDeleteFunction = (
  primaryKeys: readonly PrimaryKeyType[]
) => Promise<void>

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
}
