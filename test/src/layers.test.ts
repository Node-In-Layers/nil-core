import { assert } from 'chai'
import sinon from 'sinon'
import { features, services as layersServices } from '../../src/layers'
import { createMockFs, validConfig2, validConfig3 } from '../mocks'
import { Config, CoreNamespace, LogFormat, LogLevelNames } from '../../src'

const compositeLayersConfig1 = () => {
  const create1 = sinon.stub().returns({})
  const create2 = sinon.stub().returns({})
  const create3 = sinon.stub().returns({})
  const create4 = sinon.stub().returns({})
  const create5 = sinon.stub().returns({})
  const create6 = sinon.stub().returns({})

  const app1 = {
    name: 'app1',
    create: {
      services: create1,
    },
    services: sinon.stub().returns({ create: create1 }),
  }
  const app2 = {
    name: 'app2',
    create: {
      services: create2,
      features: create3,
      layerA: create4,
      layerB: create5,
      layerC: create6,
    },
    layerA: {
      create: create4,
    },
    layerB: {
      create: create5,
    },
    layerC: {
      create: create6,
    },
    services: {
      create: create2,
    },
    features: {
      create: create3,
    },
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2],
      layerOrder: ['services', ['layerA', 'layerB', 'layerC'], 'features'],
      logFormat: LogFormat.full,
      logLevel: LogLevelNames.silent,
    },
  }
}

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
    [CoreNamespace.layers]: layersServices.create(),
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
      it('should call layerB of app2', async () => {
        const config = compositeLayersConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual = config[CoreNamespace.root].apps[1].create.layerB.called
        assert.isTrue(actual)
      })
      it('should show NOT show features when layer C is loaded', async () => {
        const config = compositeLayersConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[1].create.layerC.getCall(0).args[0]
        assert.isUndefined(actual.features)
      })
      it('should show only layer A and Layer B when layer C is loaded', async () => {
        const config = compositeLayersConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[1].create.layerC.getCall(0).args[0]
        assert.isOk(actual.layerA)
        assert.isOk(actual.layerB)
      })
      it('should show only layer A when layer B is loaded', async () => {
        const config = compositeLayersConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[1].create.layerB.getCall(0).args[0]
        assert.isOk(actual.layerA)
        assert.isUndefined(actual.layerB)
      })
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
        const promise = instance.loadLayers()
        return assert.isRejected(promise)
      })
    })
  })
})
