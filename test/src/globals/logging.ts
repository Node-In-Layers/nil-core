import { assert } from 'chai'
import merge from 'lodash/merge.js'
import * as sinon from 'sinon'
import { compositeLogger } from '../../../src/globals/logging.js'
import { CommonContext, CoreNamespace, LogLevelNames } from '../../../src'
import { JsonAble, JsonObj } from 'functional-models'

const _getMockLogger = (context = undefined) => {
  context = merge(context, {
    config: {
      [CoreNamespace.root]: {
        logging: {
          logLevel: LogLevelNames.trace,
        },
      },
    },
    constants: {
      runtimeId: 'runtime-id',
    },
  })
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

describe.only('/src/globals/logging.ts', () => {
  describe('#compositeLogger()', () => {
    describe('#getRootLogger()', () => {
      describe('#getAppLogger()', () => {
        describe('#getLayerLogger()', () => {
          describe('#logWrapSync()', () => {
            it('should create two info messages when run and one debug when its a feature layer', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                .logWrapSync('myFunction', (log, args: object) => {
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
            it('should create two info messages when run and one debug when its a feature layer', async () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                .logWrapAsync('myFunction', async (log, args: object) => {
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
          })
          describe('#logWrapAsync()', () => {
            it('should create two info messages when run and one debug when its a feature layer', async () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const wrappedFunc = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('features')
                .logWrapAsync('myFunction', async (log, args: object) => {
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
            it('should create a functionCall id automatically', () => {
              const { context, logger, mockLogMethod } = _getMockLogger()
              const log = logger
                .getLogger(context)
                .getAppLogger('myApp')
                .getLayerLogger('services')
                .getFunctionLogger('myFunction')
              log.info('test')
              const actual = mockLogMethod
                .getCall(0)
                .args[0].ids.find(x => 'functionCall' in x)
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
          })
        })
      })
    })
  })
})
