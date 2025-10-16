#!/usr/bin/env tsx

import esMain from 'es-main'
import { ArgumentParser } from 'argparse'
import * as core from '@node-in-layers/core'
import * as config from '../dist/config.prod.mjs'

const _parseArguments = () => {
  const parser = new ArgumentParser({
    description: 'Starts the MCP server.',
  })
  return parser.parse_args()
}

const startServer = async () => {
  const context = await core.loadSystem({
    environment: 'prod',
    config: config.default(),
  })
  await context.mcp.mcp.start()
}

if (esMain(import.meta)) {
  const args = _parseArguments()
  startServer(args.environment).catch(error => {
    console.error('Failed to start the server:', error)
    process.exit(1)
  })
}
