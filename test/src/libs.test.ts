import { assert } from 'chai'
import {
  getLogLevelName,
  validateConfig,
  getLayersUnavailable,
  combineCrossLayerProps,
} from '../../src/libs.js'
import { CoreNamespace } from '../../src'

describe('/src/libs.ts', () => {
  describe('#combineCrossLayerProps()', () => {
    it('should combine cross layer props', () => {
      const a = {
        logging: {
          ids: [{ runtimeId: '209a63e8-3323-4672-8915-3e9c8903e9d3' }],
        },
      }
      const b = {
        logging: {
          ids: [{ requestId: '4e335178-19a3-45f9-9dfe-5431bb19e616' }],
        },
      }
      const expected = {
        logging: {
          ids: [
            {
              runtimeId: '209a63e8-3323-4672-8915-3e9c8903e9d3',
            },
            {
              requestId: '4e335178-19a3-45f9-9dfe-5431bb19e616',
            },
          ],
        },
      }
      const actual = combineCrossLayerProps(a, b)
      assert.deepEqual(actual, expected)
    })
  })
  describe('#getLayersUnavailable()', () => {
    it('should throw an exception when passing an unused layer', () => {
      assert.throws(() => {
        getLayersUnavailable(['services', 'features'])('not-real')
      })
    })
    it('should return [] when using [services, features] and features', () => {
      const actual = getLayersUnavailable(['services', 'features'])('features')
      const expected = []
      assert.deepEqual(actual, expected)
    })
    it('should return features when using [services, features] and services', () => {
      const actual = getLayersUnavailable(['services', 'features'])('services')
      const expected = ['features']
      assert.deepEqual(actual, expected)
    })
    it('should return higher when using [services, features, higher] and features', () => {
      const actual = getLayersUnavailable(['services', 'features', 'higher'])(
        'features'
      )
      const expected = ['higher']
      assert.deepEqual(actual, expected)
    })
  })
  describe('#validateConfig()', () => {
    it('should throw an exception when an app doesnt have a name', () => {
      assert.throws(() => {
        validateConfig({
          systemName: 'nil-core',
          environment: 'unit-test',
          [CoreNamespace.root]: {
            apps: [
              {
                name: 'testme',
              },
              {},
            ],
            layerOrder: ['services', 'features'],
            logFormat: 'full',
            logLevel: 'silent',
          },
        })
      }, 'A configured app does not have a name')
    })
    it('should throw an exception when logLevel is a number', () => {
      assert.throws(() => {
        validateConfig({
          systemName: 'nil-core',
          environment: 'unit-test',
          [CoreNamespace.root]: {
            apps: [
              {
                name: 'testme',
              },
            ],
            layerOrder: ['services', 'features'],
            logFormat: 'full',
            logLevel: 0,
          },
        })
      })
    })
    it('should throw an exception when layerOrder is not an array', () => {
      assert.throws(() => {
        validateConfig({
          systemName: 'nil-core',
          environment: 'unit-test',
          [CoreNamespace.root]: {
            apps: [
              {
                name: 'testme',
              },
            ],
            layerOrder: 'features',
            logFormat: 'full',
            logLevel: 'silent',
          },
        })
      })
    })
    it('should throw an exception when layerOrder is missing', () => {
      assert.throws(() => {
        validateConfig({
          systemName: 'nil-core',
          environment: 'unit-test',
          [CoreNamespace.root]: {
            apps: [
              {
                name: 'testme',
              },
            ],
            logFormat: 'full',
            logLevel: 'silent',
          },
        })
      })
    })
    it('should throw an exception when apps is missing', () => {
      assert.throws(() => {
        validateConfig({
          systemName: 'nil-core',
          environment: 'unit-test',
          [CoreNamespace.root]: {
            layerOrder: ['services', 'features'],
            logFormat: 'full',
            logLevel: 'silent',
          },
        })
      })
    })
  })
  describe('#getLogLevelName()', () => {
    it('should throw an exception for -1', () => {
      assert.throws(() => {
        getLogLevelName(-1)
      })
    })
    it('should return TRACE for 0', () => {
      const actual = getLogLevelName(0)
      const expected = 'TRACE'
      assert.equal(actual, expected)
    })
    it('should return DEBUG for 1', () => {
      const actual = getLogLevelName(1)
      const expected = 'DEBUG'
      assert.equal(actual, expected)
    })
    it('should return WARN for 2', () => {
      const actual = getLogLevelName(2)
      const expected = 'INFO'
      assert.equal(actual, expected)
    })
    it('should return WARN for for 3', () => {
      const actual = getLogLevelName(3)
      const expected = 'WARN'
      assert.equal(actual, expected)
    })
    it('should return ERROR for for 4', () => {
      const actual = getLogLevelName(4)
      const expected = 'ERROR'
      assert.equal(actual, expected)
    })
    it('should return SILENT for 5', () => {
      const actual = getLogLevelName(5)
      const expected = 'SILENT'
      assert.equal(actual, expected)
    })
    it('should throw an exception for 6', () => {
      assert.throws(() => {
        getLogLevelName(6)
      })
    })
  })
})
