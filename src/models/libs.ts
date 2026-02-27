import { PropertyType } from 'functional-models'
import { CommonContext, Config, CoreNamespace } from '../types.js'

/**
 * Builds the composite key used to look up model-specific configuration (e.g. primary key type).
 * Format: `domain/PluralModelName`
 * @param domain - The domain namespace of the model.
 * @param modelPluralName - The plural name of the model.
 */
export const createKeyModelName = (domain: string, modelPluralName: string) => {
  return `${domain}/${modelPluralName}`
}

/**
 * Resolves the primary key data type for a given model. Checks `modelNameToIdPropertyType` first,
 * then falls back to `modelIdPropertyType`, then defaults to `UniqueId` (UUID).
 * @param context - The common context containing the config.
 * @param domain - The domain namespace of the model.
 * @param name - The plural name of the model.
 */
export const getPrimaryKeyDataType = <TConfig extends Config = Config>(
  context: CommonContext<TConfig>,
  domain: string,
  name: string
) => {
  const modelNameToIdPropertyType =
    context.config[CoreNamespace.root].modelNameToIdPropertyType || {}
  const keyModelName = createKeyModelName(domain, name)

  const dataType = modelNameToIdPropertyType[keyModelName]
    ? modelNameToIdPropertyType[keyModelName]
    : context.config[CoreNamespace.root].modelIdPropertyType ||
      PropertyType.UniqueId

  return dataType
}

/**
 * Resolves the primary key generator function for a given model. Checks `modelNameToPrimaryKeyGenerator`
 * first, then falls back to the global `primaryKeyGenerator` in config.
 * @param context - The common context containing the config.
 * @param domain - The domain namespace of the model.
 * @param name - The plural name of the model.
 */
export const getPrimaryKeyGenerator = <TConfig extends Config = Config>(
  context: CommonContext<TConfig>,
  domain: string,
  name: string
) => {
  const modelNameToPrimaryKeyGenerator =
    context.config[CoreNamespace.root].modelNameToPrimaryKeyGenerator || {}
  const keyModelName = createKeyModelName(domain, name)

  const primaryKeyGenerator = modelNameToPrimaryKeyGenerator[keyModelName]
    ? modelNameToPrimaryKeyGenerator[keyModelName]
    : context.config[CoreNamespace.root].primaryKeyGenerator

  return primaryKeyGenerator
}
