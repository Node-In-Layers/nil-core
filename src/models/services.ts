import { ModelServices } from './types.js'
import { createModelCruds } from './libs.js'

const create = (): ModelServices => {

  return {
    createModelCruds,
  }
}

export { create }
