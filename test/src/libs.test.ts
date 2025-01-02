import { assert } from 'chai'
import {
  getLogLevelName,
  validateConfig,
  getLayersUnavailable,
} from '../../src/libs.js'
import { Namespaces } from '../../src'

describe('/src/libs.ts', () => {
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
          enviroment: 'unit-test',
          [Namespaces.core]: {
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
          enviroment: 'unit-test',
          [Namespaces.core]: {
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
          enviroment: 'unit-test',
          [Namespaces.core]: {
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
          enviroment: 'unit-test',
          [Namespaces.core]: {
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
          enviroment: 'unit-test',
          [Namespaces.core]: {
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
