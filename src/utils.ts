import { randomUUID } from 'crypto'
import AsyncLock from 'async-lock'

const wrap = <T extends Array<any>, U>(fn: (...args: T) => U) => {
  return (...args: T): U => fn(...args)
}

const promiseWrap = <T extends Array<any>, U>(
  fn: (...args: T) => Promise<U> | U
) => {
  return (...args: T): Promise<U> => Promise.resolve().then(() => fn(...args))
}

const memoizeValueSync = <T, A extends Array<any>>(
  method: (...args: A) => T
) => {
  /* eslint-disable functional/no-let */
  let value: any = undefined
  let called = false
  return (...args: A) => {
    if (!called) {
      called = true
      value = method(...args)
    }

    return value
  }
  /* eslint-enable functional/no-let */
}

const memoizeValue = <T, A extends Array<any>>(
  method: (...args: A) => T | Promise<T>
): ((...args: A) => Promise<T>) => {
  const key = randomUUID()
  const lock = new AsyncLock()
  /* eslint-disable functional/no-let */
  let value: any = undefined
  let called = false
  return async (...args: A) => {
    return lock.acquire(key, async () => {
      if (!called) {
        called = true
        value = await method(...args)
      }

      return value as T
    })
  }
  /* eslint-enable functional/no-let */
}

export { wrap, promiseWrap, memoizeValue, memoizeValueSync }
