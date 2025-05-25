import { v4 } from 'uuid'
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
      value = method(...args)
      // This is very important that it goes afterwards. Sometimes this will throw an exception.
      // and if one caller happened to catch it and move on, then this will never throw again, which
      // likely means that we won't know what the heck happened.
      called = true
    }

    return value
  }
  /* eslint-enable functional/no-let */
}

const memoizeValue = <T, A extends Array<any>>(
  method: (...args: A) => T | Promise<T>
): ((...args: A) => Promise<T>) => {
  const key = v4()
  const lock = new AsyncLock()
  /* eslint-disable functional/no-let */
  let value: any = undefined
  let called = false
  return async (...args: A) => {
    return lock.acquire(key, async () => {
      if (!called) {
        value = await method(...args)
        // Read above about this.
        // eslint-disable-next-line require-atomic-updates
        called = true
      }

      return value as T
    })
  }
  /* eslint-enable functional/no-let */
}

export { wrap, promiseWrap, memoizeValue, memoizeValueSync }
