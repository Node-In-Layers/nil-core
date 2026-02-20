import merge from 'lodash/merge.js'
import { v4 } from 'uuid'
import AsyncLock from 'async-lock'
import type { RequiresInitialization } from './types.js'

export const wrap = <T extends Array<any>, U>(fn: (...args: T) => U) => {
  return merge((...args: T): U => fn(...args), fn)
}

export const isPromise = <T>(obj: any): obj is Promise<T> => {
  return Boolean(obj && obj.then)
}

export const promiseWrap = <T extends Array<any>, U>(
  fn: (...args: T) => Promise<U> | U
) => {
  return merge(
    (...args: T): Promise<U> => Promise.resolve().then(() => fn(...args)),
    fn
  )
}

export const memoizeValueSync = <T, A extends Array<any>>(
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

export const memoizeValue = <T, A extends Array<any>>(
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

/**
 * Wraps an object that needs to be explicitly initialized before use.
 * @param initializer - A function that returns a promise of the object to be initialized.
 * @returns A RequiresInitialization object.
 */
export const requiresInitialization = <T>(
  initializer: () => Promise<T>
): RequiresInitialization<T> => {
  // eslint-disable-next-line functional/no-let
  let initialized = false
  // eslint-disable-next-line functional/no-let
  let instance: T | undefined = undefined

  const initialize = async () => {
    instance = await initializer()
    initialized = true
  }

  const getInstance = (): T => {
    if (!initialized) {
      throw new Error('Instance not initialized')
    }
    return instance as unknown as T
  }

  return {
    isInitialized: () => initialized,
    getInstance,
    initialize,
  }
}
