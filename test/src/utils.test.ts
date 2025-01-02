import { assert } from 'chai'
import sinon from 'sinon'
import { wrap, promiseWrap, memoizeValueSync } from '../../src/utils'

describe('/src/utils.ts', () => {
  describe('#memorizeValueSync()', () => {
    it('should call the function twice when lazy called twice', () => {
      const func = sinon.stub().returns(5)
      const lazied = memoizeValueSync(func)
      lazied()
      lazied()
      const actual = func.callCount
      const expected = 1
      assert.equal(actual, expected)
    })
  })
  describe('#wrap()', () => {
    it('should pass every argument into the wrapped function', () => {
      const myFunc = sinon.stub()
      const func = wrap(myFunc)
      func('x', 'y', 'z')
      const actual = myFunc.getCall(0).args
      const expected = ['x', 'y', 'z']
      assert.deepEqual(actual, expected)
    })
  })
  describe('#promiseWrap()', () => {
    it('should pass every argument into the wrapped function', async () => {
      const myFunc = sinon.stub()
      const func = promiseWrap(myFunc)
      await func('x', 'y', 'z')
      const actual = myFunc.getCall(0).args
      const expected = ['x', 'y', 'z']
      assert.deepEqual(actual, expected)
    })
  })
})
