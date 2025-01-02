import { assert } from 'chai'
import sinon from 'sinon'
import { features, services as layersServices } from '../../src/layers'
import {
  createMockFs,
  validConfig1,
  validConfig2,
  validConfig3,
} from '../mocks'
import { Config, Namespaces } from '../../src'

const _setup = (config?: Config) => {
  const logger = {
    info: sinon.stub(),
    warn: sinon.stub(),
    trace: sinon.stub(),
    debug: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
  }
  const log = {
    getLogger: sinon.stub().returns(logger),
  }
  const services = {
    [Namespaces.layers]: layersServices.create(),
  }
  return {
    node: {
      fs: createMockFs(),
    },
    log,
    config: config || validConfig2(),
    constants: {
      environment: 'unit-test',
      workingDirectory: '../../',
    },
    services,
  }
}

describe('/src/layers.ts', () => {
  describe('#features.create()', () => {
    describe('#loadLayers()', () => {
      it('should load services for fakeapp', async () => {
        const inputs = _setup()
        const instance = features.create(inputs)
        const actual = await instance.loadLayers()
        assert.isOk(actual.services['fakeapp'])
      })
      it('should load features for fakeapp', async () => {
        const inputs = _setup()
        const instance = features.create(inputs)
        const actual = await instance.loadLayers()
        assert.isOk(actual.features['fakeapp'])
      })
      it('should NOT load features for fakeapp2', async () => {
        const inputs = _setup()
        const instance = features.create(inputs)
        const actual = await instance.loadLayers()
        assert.isUndefined(actual.features['fakeapp2'])
      })
      it('should throw an exception when there is an app that has a services object but create produced nothing', async () => {
        const inputs = _setup(validConfig3())
        const instance = features.create(inputs)
        assert.throws(() => {
          instance.loadLayers()
        })
      })
    })
  })
})
