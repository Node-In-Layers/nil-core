import { PropertyType } from 'functional-models'
import { CommonContext, Config, CoreNamespace } from '../types.js'

export const createKeyModelName = (domain: string, modelPluralName: string) => {
  return `${domain}/${modelPluralName}`
}

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
