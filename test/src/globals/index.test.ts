import sinon from 'sinon'
import { assert } from 'chai'
import * as chai from 'chai'
import asPromised from 'chai-as-promised'
import {
  createMockFs,
  validConfig1,
  deleteUnitTestConfig,
  writeUnitTestConfig,
} from '../../mocks'
import { services, features } from '../../../src/globals/index'

chai.use(asPromised)

const _setup = () => {
  const log = {
    info: sinon.stub(),
    warn: sinon.stub(),
    trace: sinon.stub(),
    debug: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
  }
  return {
    log,
    fs: createMockFs(),
    environment: 'unit-test',
    workingDirectory: process.cwd(),
  }
}

describe('/src/globals/index.ts', () => {
  describe('#services.create()', () => {
    it('should create a valid object', () => {
      const instance = services.create({
        environment: 'unit-test',
        workingDirectory: process.cwd(),
        nodeOverrides: {},
      })
      assert.isOk(instance)
    })
  })
  describe('#features.create()', () => {
    describe('#loadLayers()', () => {})
    describe('#loadConfig()', () => {
      before(async () => {
        deleteUnitTestConfig()
      })
      it('should load a config at config.unittest.mjs', async () => {
        writeUnitTestConfig(validConfig1())
        const inputs = _setup()
        const instance = services.create(inputs)
        const actual = await instance.loadConfig()
        const expected = validConfig1()
        assert.deepEqual(actual, expected)
      })
    })
  })
})
