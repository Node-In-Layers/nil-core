import sinon from 'sinon'
import { FSLike } from '../src/types.js'

const createMockFs = (): FSLike => {
  const mkdirSync = sinon.stub()
  const readFileSync = sinon.stub()
  const writeFileSync = sinon.stub()
  const existsSync = sinon.stub()
  const lsStatMock = {
    isFile: sinon.stub(),
    isDirectory: sinon.stub(),
    isBlockDevice: sinon.stub(),
    isCharacterDevice: sinon.stub(),
    isSymbolicLink: sinon.stub(),
    isFIFO: sinon.stub(),
    isSocket: sinon.stub(),
  }
  const lstatSync = sinon.stub().returns(lsStatMock)
  return {
    mkdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    lstatSync,
  }
}

export { createMockFs }
