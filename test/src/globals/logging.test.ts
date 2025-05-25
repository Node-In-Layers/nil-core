import { assert } from 'chai'
import axios from 'axios'
import merge from 'lodash/merge.js'
import * as sinon from 'sinon'
import {
  compositeLogger,
  consoleLogFull,
  consoleLogJson,
  consoleLogSimple,
  logTcp,
  standardLogger,
} from '../../../src/globals/logging.js'
import {
  CommonContext,
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  LogMessage,
} from '../../../src/types.js'
import { JsonObj } from 'functional-models'

// Utility to create a mock context
const _getMockLogger = (context = undefined) => {
  context = merge(
    {
      config: {
        [CoreNamespace.root]: {
          logging: {
            logLevel: LogLevelNames.trace,
          },
        },
      },
      constants: {
        runtimeId: 'runtime-id',
        environment: 'test',
      },
    },
    context
  )
  const mockLogMethod = sinon.stub()
  const mockLog = sinon.stub().returns(mockLogMethod)
  const logger = compositeLogger([mockLog])
  return {
    context: context as CommonContext,
    logger,
    mockLogMethod,
    mockLog,
  }
}

describe('/src/globals/logging.ts', () => {
  describe('#consoleLogSimple()', () => {
    let consoleSpy: sinon.SinonStub

    beforeEach(() => {
      consoleSpy = sinon.stub(console, 'info')
    })

    afterEach(() => {
      consoleSpy.restore()
    })

    it('should log a simple message with datetime and log level', () => {
      const logMessage: LogMessage = {
        id: '123',
        datetime: new Date('2025-01-01T00:00:00Z'),
        logLevel: LogLevelNames.info,
        message: 'Test message',
        logger: 'test',
        environment: 'test',
      }
      consoleLogSimple(logMessage)
      assert.isTrue(consoleSpy.calledOnce)
      assert.equal(
        consoleSpy.firstCall.args[0],
        '2025-01-01T00:00:00.000Z: Test message'
      )
    })
  })

  describe('#consoleLogFull()', () => {
    let consoleSpy: sinon.SinonStub

    beforeEach(() => {
      consoleSpy = sinon.stub(console, 'info')
    })

    afterEach(() => {
      consoleSpy.restore()
    })

    it('should log full details with ids', () => {
      const logMessage: LogMessage = {
        id: '123',
        datetime: new Date('2025-01-01T00:00:00Z'),
        logLevel: LogLevelNames.info,
        message: 'Test message',
        logger: 'test',
        environment: 'test',
        ids: [{ key1: 'value1' }, { key2: 'value2' }],
      }
      consoleLogFull(logMessage)
      assert.isTrue(consoleSpy.calledOnce)
      assert.equal(
        consoleSpy.firstCall.args[0],
        '2025-01-01T00:00:00.000Z test info 123 [test] {key1:value1;key2:value2} Test message'
      )
    })

    it('should log full details without ids', () => {
      const logMessage: LogMessage = {
        id: '123',
        datetime: new Date('2025-01-01T00:00:00Z'),
        logLevel: LogLevelNames.info,
        message: 'Test message',
        logger: 'test',
        environment: 'test',
      }
      consoleLogFull(logMessage)
      assert.isTrue(consoleSpy.calledOnce)
      assert.equal(
        consoleSpy.firstCall.args[0],
        '2025-01-01T00:00:00.000Z test info [test] Test message'
      )
    })
  })

  describe('#consoleLogJson()', () => {
    let consoleSpy: sinon.SinonStub

    beforeEach(() => {
      consoleSpy = sinon.stub(console, 'info')
    })

    afterEach(() => {
      consoleSpy.restore()
    })

    it('should log message as JSON with all fields', () => {
      const logMessage: LogMessage = {
        id: '123',
        datetime: new Date('2025-01-01T00:00:00Z'),
        logLevel: LogLevelNames.info,
        message: 'Test message',
        logger: 'test',
        environment: 'test',
        extra: 'data',
      }
      consoleLogJson(logMessage)
      assert.isTrue(consoleSpy.calledOnce)
      const expectedJson = JSON.stringify({
        id: '123',
        datetime: '2025-01-01T00:00:00.000Z',
        logLevel: 'info',
        logger: 'test',
        message: 'Test message',
        environment: 'test',
        extra: 'data',
      })
      assert.equal(consoleSpy.firstCall.args[0], expectedJson)
    })
  })

  describe('#logTcp()', () => {
    let axiosRequest: any
    let axiosStub: sinon.SinonStub
    let consoleWarn: sinon.SinonStub

    beforeEach(() => {
      axiosRequest = sinon.stub().resolves({})
      axiosStub = sinon.stub(axios, 'create').returns(axiosRequest)
      consoleWarn = sinon.stub(console, 'warn')
    })

    afterEach(() => {
      axiosStub.restore()
      consoleWarn.restore()
    })

    it('should send log message via TCP with retries on success', async () => {
      const context = {
        config: {
          [CoreNamespace.root]: {
            logging: {
              tcpLoggingOptions: {
                url: 'http://test.com',
                headers: { 'X-Test': 'test' },
              },
            },
          },
        },
      } as CommonContext
      const logMethod = logTcp(context)
      const logMessage: LogMessage = {
        id: '123',
        message: 'Test',
        logLevel: LogLevelNames.info,
      }
      await logMethod(logMessage)
      assert.isTrue(axiosStub.calledOnce)
      assert.deepEqual(axiosStub.firstCall.args[0], {
        baseURL: 'http://test.com',
        headers: { 'X-Test': 'test' },
      })
      const axiosInstance = axiosStub.returnValues[0]
      assert.isTrue(axiosInstance.calledOnceWith({ data: logMessage }))
    })

    it('should retry up to MAX_LOGGING_ATTEMPTS on failure', async () => {
      const context = {
        config: {
          [CoreNamespace.root]: {
            logging: {
              tcpLoggingOptions: { url: 'http://test.com', headers: {} },
            },
          },
        },
      } as CommonContext
      const axiosInstance = sinon
        .stub()
        .rejects(new Error('Network error')) as any
      axiosStub.returns(axiosInstance)
      const logMethod = logTcp(context)
      const logMessage: LogMessage = {
        id: '123',
        message: 'Test',
        logLevel: LogLevelNames.info,
      }
      await logMethod(logMessage)
      assert.equal(axiosInstance.callCount, 5) // MAX_LOGGING_ATTEMPTS
      assert.isTrue(consoleWarn.calledWith('Logging error'))
    })

    it('should throw if tcpLoggingOptions is missing', () => {
      const context = {
        config: { [CoreNamespace.root]: { logging: {} } },
      } as CommonContext
      assert.throws(
        () => logTcp(context),
        'Must include tcpLoggingOptions when using a tcp logger'
      )
    })
  })

  describe('#standardLogger()', () => {
    let consoleSpy: sinon.SinonStub
    let axiosRequest: sinon.SinonStub
    let axiosStub: sinon.SinonStub
    let consoleWarn: sinon.SinonStub

    beforeEach(() => {
      consoleSpy = sinon.stub(console, 'info')
      axiosRequest = sinon.stub().resolves({})
      // @ts-ignore
      axiosStub = sinon.stub(axios, 'create').returns(axiosRequest)
      consoleWarn = sinon.stub(console, 'warn')
    })

    afterEach(() => {
      consoleSpy.restore()
      axiosStub.restore()
      consoleWarn.restore()
    })

    it('should use customLogger if provided', () => {
      const customLogger = { getLogger: sinon.stub().returns({ custom: true }) }
      const context = {
        config: {
          [CoreNamespace.root]: {
            logging: { customLogger, logLevel: LogLevelNames.info },
          },
        },
        constants: { runtimeId: 'runtime-id' },
      } as CommonContext
      const logger = standardLogger().getLogger(context)
      assert.isTrue(
        customLogger.getLogger.calledOnceWith(context, {
          ids: [{ runtimeId: 'runtime-id' }],
        })
      )
      assert.deepEqual(logger, { custom: true })
    })

    it('should fall back to compositeLogger with logFormat', () => {
      const context = {
        config: {
          [CoreNamespace.root]: {
            logging: {
              logFormat: LogFormat.simple,
              logLevel: LogLevelNames.info,
            },
          },
        },
        constants: { runtimeId: 'runtime-id' },
      } as CommonContext
      const logger = standardLogger().getLogger(context)
      logger.info('Test')
      assert.isTrue(consoleSpy.calledOnce)
    })

    // New test for lines 155-158
    it('should handle array of log formats in standardLogger', async () => {
      const context = {
        config: {
          [CoreNamespace.root]: {
            logging: {
              logFormat: [
                LogFormat.simple,
                LogFormat.full,
                LogFormat.json,
                LogFormat.tcp,
              ],
              logLevel: LogLevelNames.info,
              tcpLoggingOptions: {
                url: 'test',
                headers: {},
              },
            },
          },
        },
        constants: { runtimeId: 'runtime-id', environment: 'test' },
      } as CommonContext
      const logger = standardLogger().getLogger(context)
      await logger.info('Test')
      assert.equal(consoleSpy.callCount, 3)
      //assert.equal(consoleSpy.firstCall.args[0], `${new Date('2025-04-010Z').toISOString()}: Test`)
      assert.match(consoleSpy.firstCall.args[0], /.*: Test/)
      assert.match(consoleSpy.secondCall.args[0], /.* test info .*/)
      assert.isOk(consoleSpy.thirdCall.args[0])
      assert.isOk(axiosRequest.getCall(0).args[0])
    })
  })

  describe('#compositeLogger()', () => {
    describe('#getRootLogger()', () => {
      it('should respect silent log level', () => {
        const { context, logger, mockLogMethod } = _getMockLogger({
          config: {
            [CoreNamespace.root]: {
              logging: { logLevel: LogLevelNames.silent },
            },
          },
        })
        const rootLogger = logger.getLogger(context)
        rootLogger.info('Should not log')
        assert.isFalse(mockLogMethod.called)
      })

      it('should filter logs below log level', () => {
        const { context, logger, mockLogMethod } = _getMockLogger({
          config: {
            [CoreNamespace.root]: { logging: { logLevel: LogLevelNames.warn } },
          },
        })
        const rootLogger = logger.getLogger(context)
        rootLogger.info('Should not log')
        rootLogger.warn('Should log')
        assert.equal(mockLogMethod.callCount, 1)
        assert.equal(mockLogMethod.firstCall.args[0].message, 'Should log')
      })

      it('should include runtimeId in ids', () => {
        const { context, logger, mockLogMethod } = _getMockLogger()
        const rootLogger = logger.getLogger(context)
        rootLogger.info('Test')
        const ids = mockLogMethod.firstCall.args[0].ids
        assert.deepEqual(ids, [{ runtimeId: 'runtime-id' }])
      })

      it('should merge additional data', () => {
        const { context, logger, mockLogMethod } = _getMockLogger()
        const rootLogger = logger.getLogger(context, {
          data: { extra: 'data' },
        })
        rootLogger.info('Test')
        assert.equal(mockLogMethod.firstCall.args[0].extra, 'data')
      })

      describe('#getAppLogger()', () => {
        it('should set app name in logger', () => {
          const { context, logger, mockLogMethod } = _getMockLogger()
          const appLogger = logger.getLogger(context).getAppLogger('myApp')
          appLogger.info('Test')
          assert.equal(mockLogMethod.firstCall.args[0].logger, 'myApp')
          assert.equal(mockLogMethod.firstCall.args[0].app, 'myApp')
        })

        describe('#getLayerLogger()', () => {
          it('should set layer name in logger', () => {
            const { context, logger, mockLogMethod } = _getMockLogger()
            const layerLogger = logger
              .getLogger(context)
              .getAppLogger('myApp')
              .getLayerLogger('services')
            layerLogger.info('Test')
            assert.equal(
              mockLogMethod.firstCall.args[0].logger,
              'myApp:services'
            )
            assert.equal(mockLogMethod.firstCall.args[0].layer, 'services')
          })

          it('should merge crossLayerProps', () => {
            const { context, logger, mockLogMethod } = _getMockLogger()
            const layerLogger = logger
              .getLogger(context)
              .getAppLogger('myApp')
              .getLayerLogger('services', {
                logging: { ids: [{ custom: 'id' }] },
              })
            layerLogger.info('Test')
            const ids = mockLogMethod.firstCall.args[0].ids
            assert.deepEqual(
              ids.find((x: any) => 'custom' in x),
              { custom: 'id' }
            )
          })

          describe('#_logWrapSync()', () => {
            it('should pass ids through crossLayer', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapSync(
                  'myFunction',
                  (log, args: object, crossLayer: any) => {}
                )

              wrappedFunc(
                { my: 'args' },
                { logging: { ids: [{ my: 'crossLayer' }] } }
              )

              const actual = mockLogMethod
                .getCall(0)
                .args[0].ids.find(x => 'my' in x)
              assert.isOk(actual)
            })

            it('should create two info messages when run and one debug when its a feature layer', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapSync('myFunction', (log, args: object) => {
                  log.debug('My middle message', {
                    args: args as JsonObj,
                  })
                })

              wrappedFunc({ my: 'args' })

              const actual = mockLogMethod
                .getCalls()
                .map(call => call.args[0].logLevel)
              const expected = ['info', 'debug', 'info']
              assert.deepEqual(actual, expected)
            })

            it('should log an error message and rethrow when sync function fails', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapSync('myFunction', (log, args: object) => {
                  throw new Error('Sync failure')
                })

              try {
                wrappedFunc({ my: 'args' })
                assert.fail('Expected function to throw an error')
              } catch (e) {
                const calls = mockLogMethod.getCalls()
                assert.equal(calls.length, 2, 'Expected two log calls')
                assert.equal(
                  calls[0].args[0].logLevel,
                  'info',
                  'First call should be info'
                )
                assert.equal(
                  calls[0].args[0].message,
                  'Executing features function',
                  'First message mismatch'
                )
                assert.equal(
                  calls[1].args[0].logLevel,
                  'error',
                  'Second call should be error'
                )
                assert.equal(
                  calls[1].args[0].message,
                  'Function failed with an exception',
                  'Error message mismatch'
                )
                assert.deepEqual(
                  calls[1].args[0].error,
                  {
                    code: 'INTERNAL_ERROR',
                    details: 'Sync failure',
                    errorDetails: 'Error: Sync failure',
                    message: 'Layer function features:myFunction',
                  },
                  'Expected error object'
                )
                assert.instanceOf(e, Error, 'Expected an Error object')
                assert.equal(
                  (e as Error).message,
                  'Sync failure',
                  'Thrown error message mismatch'
                )
              }
            })
          })

          describe('#_logWrapAsync()', () => {
            it('should pass ids through crossLayer', async () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapAsync(
                  'myFunction',
                  (log, args: object, crossLayer: any) => Promise.resolve()
                )

              await wrappedFunc(
                { my: 'args' },
                { logging: { ids: [{ my: 'crossLayer' }] } }
              )

              const actual = mockLogMethod
                .getCall(0)
                .args[0].ids.find(x => 'my' in x)
              assert.isOk(actual)
            })
            it('should create two info messages when run and one debug when its a feature layer', async () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapAsync('myFunction', async (log, args: object) => {
                  log.debug('My middle message', {
                    args: args as JsonObj,
                  })
                  return {}
                })

              await wrappedFunc({ my: 'args' })

              const actual = mockLogMethod
                .getCalls()
                .map(call => call.args[0].logLevel)
              const expected = ['info', 'debug', 'info']
              assert.deepEqual(actual, expected)
            })

            it('should log an error message and rethrow when async function fails', async () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                ._logWrapAsync('myFunction', async (log, args: object) => {
                  throw new Error('Async failure')
                })

              try {
                await wrappedFunc({ my: 'args' })
                assert.fail('Expected function to throw an error')
              } catch (e) {
                const calls = mockLogMethod.getCalls()
                assert.equal(calls.length, 2, 'Expected two log calls')
                assert.equal(
                  calls[0].args[0].logLevel,
                  'info',
                  'First call should be info'
                )
                assert.equal(
                  calls[0].args[0].message,
                  'Executing features function',
                  'First message mismatch'
                )
                assert.equal(
                  calls[1].args[0].logLevel,
                  'error',
                  'Second call should be error'
                )
                assert.equal(
                  calls[1].args[0].message,
                  'Function failed with an exception',
                  'Error message mismatch'
                )
                assert.deepEqual(
                  calls[1].args[0].error,
                  {
                    code: 'INTERNAL_ERROR',
                    details: 'Async failure',
                    errorDetails: 'Error: Async failure',
                    message: 'Layer function features:myFunction',
                  },
                  'Expected error object'
                )
                assert.instanceOf(e, Error, 'Expected an Error object')
                assert.equal(
                  (e as Error).message,
                  'Async failure',
                  'Thrown error message mismatch'
                )
              }
            })
          })

          describe('#getFunctionLogger()', () => {
            it('should produce a logger named myApp:services:myFunction when a log message is created', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
                .getFunctionLogger('myFunction')
              log.info('test')
              const actual = mockLogMethod.getCall(0).args[0].logger
              const expected = 'myApp:services:myFunction'
              assert.deepEqual(actual, expected)
            })

            it('should create a functionCallId automatically', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
                .getFunctionLogger('myFunction')
              log.info('test')
              const actual = mockLogMethod
                .getCall(0)
                .args[0].ids.find(x => 'functionCallId' in x)
              assert.isOk(actual)
            })

            it('should have function:myFunction as a property in the message', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
                .getFunctionLogger('myFunction')
              log.info('test')
              const actual = mockLogMethod.getCall(0).args[0].function
              const expected = 'myFunction'
              assert.deepEqual(actual, expected)
            })

            it('should combine ids from crossLayerProps', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
                .getFunctionLogger('myFunction', {
                  logging: {
                    ids: [{ fake: 'id' }],
                  },
                })
              log.info('test')
              const actual = mockLogMethod
                .getCall(0)
                .args[0].ids.find(x => 'fake' in x)
              const expected = { fake: 'id' }
              assert.deepEqual(actual, expected)
            })

            // New test for lines 342-345
            it('should throw when getIdLogger is called with object logIdOrKey and no value', () => {
              const { context, logger } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
              assert.throws(
                () =>
                  log
                    .getFunctionLogger('myFunction')
                    .getIdLogger('test', 'keyNoValue'),
                'Need value if providing a key'
              )
            })
            it('should create an LogId object is used', () => {
              const { context, logger } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
              const idLog = log.getIdLogger('name', { id: 'key' })
              assert.isOk(idLog.getIds().find(x => 'id' in x))
            })
          })
        })
      })
    })
  })

  // Additional tests for internal helpers indirectly
  describe('Internal Helpers', () => {
    describe('_combineIds', () => {
      it('should combine ids into a string', () => {
        const { context, logger, mockLogMethod } = _getMockLogger()
        const log = logger.getLogger(context, {
          ids: [{ key1: 'val1' }, { key2: 'val2' }],
        })
        log.info('Test')
        assert.isTrue(mockLogMethod.calledOnce)
        // _combineIds is used in consoleLogFull, but we test via mock
      })
    })

    describe('_shouldIgnore', () => {
      it('should ignore logs when silent', () => {
        const { context, logger, mockLogMethod } = _getMockLogger({
          config: {
            [CoreNamespace.root]: {
              logging: { logLevel: LogLevelNames.silent },
            },
          },
        })
        logger.getLogger(context).info('Test')
        assert.isFalse(mockLogMethod.called)
      })
    })

    describe('_getLogMethodFromFormat', () => {
      it('should throw for custom format without override', () => {
        const context = {
          config: {
            [CoreNamespace.root]: { logging: { logFormat: LogFormat.custom } },
          },
        } as CommonContext
        assert.throws(
          () => standardLogger().getLogger(context),
          /customLogger should override/
        )
      })

      it('should throw for unsupported format', () => {
        const context = {
          config: {
            [CoreNamespace.root]: { logging: { logFormat: 'invalid' as any } },
          },
        } as CommonContext
        assert.throws(
          () => standardLogger().getLogger(context),
          /not supported/
        )
      })

      // New test for lines 169-171 (explicit unsupported format)
      it('should throw for explicitly unsupported log format', () => {
        const context = {
          config: {
            [CoreNamespace.root]: {
              logging: {
                logFormat: 'bogus' as LogFormat,
                logLevel: LogLevelNames.info,
              },
            },
          },
          constants: { runtimeId: 'runtime-id' },
        } as CommonContext
        assert.throws(
          () => standardLogger().getLogger(context),
          'LogFormat bogus is not supported'
        )
      })
    })

    describe('_isErrorObj', () => {
      it('should log error object correctly', () => {
        const { context, logger, mockLogMethod } = _getMockLogger()
        const log = logger.getLogger(context)
        log.error('Test', { error: new Error('Oops') })
        assert.deepEqual(
          mockLogMethod.firstCall.args[0].error,
          new Error('Oops')
        )
      })
    })

    describe('_getIdsWithRuntime', () => {
      it('should avoid duplicate runtimeId', () => {
        const { context, logger, mockLogMethod } = _getMockLogger()
        const log = logger.getLogger(context, {
          ids: [{ runtimeId: 'custom' }],
        })
        log.info('Test')
        const ids = mockLogMethod.firstCall.args[0].ids
        assert.equal(ids.length, 1)
        assert.deepEqual(ids[0], { runtimeId: 'custom' })
      })
    })
  })
})
