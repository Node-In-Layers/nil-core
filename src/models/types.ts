import {
  DataDescription,
  OrmModel,
  OrmModelInstance,
  OrmSearch,
  OrmSearchResult,
  PrimaryKeyType,
  ToObjectResult,
} from 'functional-models'

enum ModelsNamespace {
  root = '@node-in-layers/core/models',
}

/**
 * The CRUDS functions for a model
 * @interface
 */
type ModelFunctions<TData extends DataDescription> = Readonly<{
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
  ) => ModelFunctions<TData>
}>

/**
 * The Core Model Services Layer
 * @interface
 */
type ModelServicesLayer = Readonly<{
  /**
   * Model Services
   */
  [ModelsNamespace.root]: ModelServices
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
 * Core Models Features
 * @interface
 */
type ModelsFeaturesLayer = Readonly<{
  /**
   * Creates a feature that is the CRUDS functions.
   * @param model - The model to wrap
   * @param options - The options to use.
   */
  createModelCruds: <TData extends DataDescription>(
    model: OrmModel<TData>,
    options?: CrudsOptions<TData>
  ) => ModelFunctions<TData>
}>

/**
 * Options for building CRUDS interfaces with a model
 * @interface
 */
type CrudsOptions<TData extends DataDescription> = Readonly<{
  /**
   * Override any individual function.
   */
  overrides?: Partial<ModelFunctions<TData>>
}>

/**
 * Model PluralName to Model
 */
type ModelsPackage = Readonly<Record<string, OrmModel<any>>>

export {
  ModelsPackage,
  ModelsFeaturesLayer,
  ModelsNamespace,
  ModelServicesLayer,
  UpdateFunction,
  DeleteFunction,
  SearchFunction,
  CreateFunction,
  CrudsOptions,
  RetrieveFunction,
  ModelFunctions,
  ModelServices,
}
