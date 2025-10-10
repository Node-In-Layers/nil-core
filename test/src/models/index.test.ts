import { assert } from 'chai'
import { name } from '../../../src/models/index.js'

describe('/src/models/index.ts', () => {
  it('exports name', () => {
    assert.equal(name, '@node-in-layers/core/models')
  })
})
