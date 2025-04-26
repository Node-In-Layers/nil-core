import { assert } from 'chai'
import get from 'lodash/get'
import sinon from 'sinon'
import { Model, PrimaryKeyUuidProperty } from 'functional-models'
import { features, services as layersServices } from '../../src/layers'
import { DoNothingFetcher } from '../../src/libs'
import { createMockFs, validConfig2, validConfig3 } from '../mocks'
import {
  compositeLogger,
  Config,
  CoreNamespace,
  LogFormat,
  LogLevelNames,
} from '../../src'

const modelsConfig1 = () => {
  const app1Models = {
    Model1: {
      create: sinon.stub().callsFake(props => {
        return props.Model({
          pluralName: 'Model1',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      }),
    },
  }

  const app2Models = {
    Model2: {
      create: sinon.stub().callsFake(props =>
        props.Model({
          pluralName: 'Model2',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      ),
    },
  }

  const app1Services = {
    create: sinon.stub().returns({}),
  }

  const app2Services = {
    create: sinon.stub().returns({}),
  }

  const app2Features = {
    create: sinon.stub().returns({}),
  }

  const app1 = {
    name: 'app1',
    models: app1Models,
    create: {
      models: app1Models,
      services: app1Services.create,
    },
    services: app1Services,
  }
  const app2 = {
    name: 'app2',
    models: app2Models,
    create: {
      models: app2Models,
      services: app2Services.create,
      features: app2Features.create,
    },
    features: app2Features,
    services: app2Services,
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2],
      layerOrder: ['services', 'features'],
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
    },
  }
}

const modelsConfig2 = () => {
  const app1Models = {
    Model1: {
      create: sinon.stub().callsFake(props => {
        return props.Model({
          pluralName: 'Model1',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      }),
    },
  }

  const app2Models = {
    Model2: {
      create: sinon.stub().callsFake(props =>
        props.Model({
          pluralName: 'Model2',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      ),
    },
  }

  const app1Services = {
    create: sinon.stub().returns({}),
  }

  const app2Services = {
    create: sinon.stub().returns({}),
  }

  const app2Features = {
    create: sinon.stub().returns({}),
  }

  const app1 = {
    name: 'app1',
    models: app1Models,
    create: {
      models: app1Models,
      services: app1Services.create,
    },
    services: app1Services,
  }
  const app2 = {
    name: 'app2',
    models: app2Models,
    create: {
      models: app2Models,
      services: app2Services.create,
      features: app2Features.create,
    },
    features: app2Features,
    services: app2Services,
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2],
      layerOrder: ['services', 'features'],
      modelCruds: true,
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
    },
  }
}

const modelsConfig3 = () => {
  const app1Models = {
    Model1: {
      create: sinon.stub().callsFake(props => {
        return props.Model({
          pluralName: 'Model1',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      }),
    },
  }

  const app2Models = {
    Model2: {
      create: sinon.stub().callsFake(props =>
        props.Model({
          pluralName: 'Model2',
          namespace: 'nil-core',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
      ),
    },
  }

  const app3Services = {
    create: sinon.stub().returns({}),
  }
  const app3Features = {
    create: sinon.stub().returns({}),
  }

  const app1 = {
    name: 'app1',
    models: app1Models,
    create: {
      models: app1Models,
    },
  }
  const app2 = {
    name: 'app2',
    models: app2Models,
    create: {
      models: app2Models,
    },
  }
  const app3 = {
    name: 'app3',
    create: {
      services: app3Services.create,
      features: app3Features.create,
    },
    features: app3Features,
    services: app3Services,
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2, app3],
      layerOrder: ['services', 'features'],
      modelCruds: true,
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
    },
  }
}

const customLayer1 = () => {
  const app1 = {
    name: 'app1',
    services: {
      create: sinon.stub().callsFake(context => ({
        logIt: () => {
          const log = context.log.getFunctionLogger('logIt')
          log.info('Test my logging')
        },
      })),
    },
    features: {
      create: sinon.stub().returns({}),
    },
    customLayer: {
      create: sinon.stub().returns({ app1: 'custom' }),
    },
  }
  const app2 = {
    name: 'app2',
    customLayer: {
      create: sinon.stub().returns({}),
    },
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2],
      layerOrder: ['services', 'features', ['entries', 'customLayer']],
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.debug,
      },
    },
  }
}

const customLayer2 = () => {
  const app1 = {
    name: 'app1',
    services: {
      create: sinon.stub().returns({}),
    },
    features: {
      create: sinon.stub().returns({}),
    },
    entries: {
      create: sinon.stub().returns({}),
    },
    customLayer: {
      create: sinon.stub().returns({ app1: 'custom' }),
    },
  }
  const app2 = {
    name: 'app2',
    entries: {
      create: sinon.stub().returns({}),
    },
    customLayer: {
      create: sinon.stub().returns({}),
    },
  }
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: [app1, app2],
      layerOrder: ['services', 'features', ['entries', 'customLayer']],
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
    },
  }
}

const customModelsConfig1 = () => {
  const config = modelsConfig1()
  const CustomModelFactory = sinon.stub().callsFake((...args) => {
    // @ts-ignore
    return Model(...args)
  })
  const CustomModelFactory2 = sinon.stub().callsFake((...args) => {
    // @ts-ignore
    return Model(...args)
  })
  const getModelProps = sinon.stub().returns({
    Model: CustomModelFactory2,
    fetcher: DoNothingFetcher,
  })
  const app3Services = {
    create: sinon.stub().returns({
      getModelProps,
    }),
  }
  const customFactoryServices = {
    create: sinon.stub().returns({
      getModelProps: sinon.stub().returns({
        Model: CustomModelFactory,
        fetcher: DoNothingFetcher,
      }),
    }),
  }
  const apps = [
    {
      name: 'customFactory',
      services: customFactoryServices,
      CustomModelFactory,
    },
    {
      name: 'app3',
      services: app3Services,
      CustomModelFactory2,
    },
    // @ts-ignore
  ].concat(config[CoreNamespace.root].apps)
  return {
    environment: 'unit-test',
    systemName: 'nil-core',
    [CoreNamespace.root]: {
      apps: apps,
      layerOrder: ['services', 'features'],
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
      modelFactory: 'customFactory',
    },
  }
}

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
      logging: {
        logFormat: LogFormat.full,
        logLevel: LogLevelNames.trace,
      },
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
  }
  const functionLogger = sinon.stub().returns(logger)
  const layerLogger = {
    ...logger,
    getFunctionLogger: sinon.stub().returns(functionLogger),
  }
  const appLogger = {
    ...logger,
    getLayerLogger: sinon.stub().returns(layerLogger),
  }
  const mockLogMethod = sinon.stub()
  const rootLogger = compositeLogger([() => mockLogMethod])

  const services = {
    [CoreNamespace.layers]: layersServices.create(),
  }
  return {
    _logging: {
      rootLogger,
      mockLogMethod,
    },
    node: {
      fs: createMockFs(),
    },
    rootLogger,
    config: config || validConfig2(),
    constants: {
      runtimeId: 'unit-test-id',
      environment: 'unit-test',
      workingDirectory: '../../',
    },
    services,
  }
}

describe('/src/layers.ts', () => {
  describe('#features.create()', () => {
    describe('#loadLayers()', () => {
      it('should produce layerLogger than when it logs, it has the appName followed by the layerName', async () => {
        const config = customLayer1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actualContext =
          inputs.config['@node-in-layers/core'].apps[0].services.create.getCall(
            0
          ).args[0]
        actualContext.log.info('Test me')
        console.log(inputs._logging.mockLogMethod.getCall(0).args[0])
        const actual = inputs._logging.mockLogMethod.getCall(0).args[0].logger
        const expected = 'app1:services'
        assert.deepEqual(actual, expected)
      })
      it('should produce app1:services:logIt when a function logger is used in a service.', async () => {
        const config = customLayer1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        const fullContext = await instance.loadLayers()
        fullContext.services.app1.logIt()
        const actual = inputs._logging.mockLogMethod.getCall(0).args[0].logger
        const expected = 'app1:services:logIt'
        assert.deepEqual(actual, expected)
      })
      it('should pass app1 customLayer to app2 customLayer even if app2 doesnt have a features layer', async () => {
        const config = customLayer1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[1].customLayer.create.getCall(0)
            .args[0].customLayer
        const expected = {
          app1: { app1: 'custom' },
        }
        assert.deepEqual(actual, expected)
      })
      it('should NOT pass app1 customLayer to app2 entries', async () => {
        const config = customLayer2()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[1].entries.create.getCall(0).args[0]
            .customLayer
        assert.isUndefined(actual)
      })
      it('should pass app1 models to app1 services', async () => {
        const config = modelsConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[0].create.services.getCall(0).args[0]
            .models['app1'].getModels
        assert.isOk(actual)
      })
      it('should have model CRUDS in services when modelCruds is true', async () => {
        const config = modelsConfig2()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        const layers = await instance.loadLayers()
        const actual = Object.keys(layers.services.app1.cruds)
        const expected = ['Model1']
        assert.isOk(actual)
      })
      it('should have model CRUDS in app2.features when modelCruds is true', async () => {
        const config = modelsConfig2()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        const layers = await instance.loadLayers()
        const actual = Object.keys(layers.features.app2.cruds)
        const expected = ['Model1']
        assert.isOk(actual)
      })
      it('should NOT have model CRUDS in app1.features when modelCruds is true because there are no features', async () => {
        const config = modelsConfig2()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        const layers = await instance.loadLayers()
        const actual = get(layers, 'features.app1.cruds')
        assert.isUndefined(actual)
      })
      describe('#getModels()', () => {
        it('should have Model1 in output', async () => {
          const config = modelsConfig1()
          const inputs = _setup(config)
          const instance = features.create(inputs)
          await instance.loadLayers()
          const actual = config[CoreNamespace.root].apps[0].create.services
            .getCall(0)
            .args[0].models['app1'].getModels().Model1
          assert.isOk(actual)
        })
        it('should NOT create Model1 if getModels isnt called', async () => {
          const config = modelsConfig1()
          const inputs = _setup(config)
          const instance = features.create(inputs)
          await instance.loadLayers()
          assert.isFalse(
            config[CoreNamespace.root].apps[0].models.Model1.create.called
          )
        })
        it('should create Model1 when getModels() is called', async () => {
          const config = modelsConfig1()
          const inputs = _setup(config)
          const instance = features.create(inputs)
          await instance.loadLayers()
          config[CoreNamespace.root].apps[0].create.services
            .getCall(0)
            .args[0].models['app1'].getModels()
          assert.isTrue(
            config[CoreNamespace.root].apps[0].models.Model1.create.called
          )
        })
        it('should use CustomModelFactory provided by the config', async () => {
          const config = customModelsConfig1()
          const inputs = _setup(config)
          const instance = features.create(inputs)
          await instance.loadLayers()
          config[CoreNamespace.root].apps[3].services.create
            .getCall(0)
            .args[0].models['app2'].getModels()
          assert.isTrue(
            config[CoreNamespace.root].apps[0].CustomModelFactory.called
          )
        })
        describe('#getModel()', () => {
          it('should pass app1 models via the getModel to app2 models', async () => {
            const config = modelsConfig1()
            const inputs = _setup(config)
            const instance = features.create(inputs)
            await instance.loadLayers()
            config[CoreNamespace.root].apps[1].create.services
              .getCall(0)
              .args[0].models['app2'].getModels()
            const actual = config[
              CoreNamespace.root
            ].apps[1].models.Model2.create
              .getCall(0)
              .args[0].getModel('app1', 'Model1')()
              .getModelDefinition().pluralName
            const expected = 'Model1'
            assert.isOk(expected)
          })
        })
      })
      it('should pass app1 models to app1 services', async () => {
        const config = modelsConfig1()
        const inputs = _setup(config)
        const instance = features.create(inputs)
        await instance.loadLayers()
        const actual =
          config[CoreNamespace.root].apps[0].create.services.getCall(0).args[0]
            .models['app1']
        assert.isOk(actual)
      })
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
