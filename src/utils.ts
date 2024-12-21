const wrap = <T extends Array<any>, U>(fn: (...args: T) => U) => {
  return (...args: T): U => fn(...args)
}

const promiseWrap = <T extends Array<any>, U>(
  fn: (...args: T) => Promise<U> | U
) => {
  return (...args: T): Promise<U> => Promise.resolve().then(() => fn(...args))
}

export { wrap, promiseWrap }
