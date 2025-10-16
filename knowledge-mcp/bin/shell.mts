#!/usr/bin/env tsx

import invoke from 'lodash/invoke.js'
import esMain from 'es-main'
import { ArgumentParser } from 'argparse'
import repl from 'repl'
import chalk from 'chalk'
import merge from 'lodash/merge.js'
import { queryBuilder } from 'functional-models'
import * as core from '@node-in-layers/core'
import { System } from '../src/types.js'

const _parseArguments = () => {
  const parser = new ArgumentParser({
    description: 'Starts a shell environment into the system.',
  })
  parser.add_argument('environment', {
    help: 'The environment for the service.',
  })
  parser.add_argument('-c', '--command', {
    help: 'A dot path command to run',
  })
  parser.add_argument('-d', '--data', {
    help: 'Stringified JSON data to pass to the command',
  })
  return parser.parse_args()
}

const _systemStartup = async environment => {
  return core.loadSystem({
    environment,
  }) as unknown as System
}

const help = objects => () => {
  console.info(chalk.white.bold(`You have access to the following objects:`))
  console.info(chalk.white.bold(`[${Object.keys(objects).join(', ')}]`))
  console.info()
  console.info(
    chalk.white.bold('You can also write "help()" to see this again.')
  )
}

const runCommand = async (objects, command, data) => {
  return invoke(objects, command, data)
}

const main = async () => {
  const args = _parseArguments()
  const objects = { ...(await _systemStartup(args.environment)), queryBuilder }
  process.on('SIGINT', async function () {
    await objects.services['@node-in-layers/data'].cleanup()
    process.exit()
  })
  if (args.command) {
    const result = await runCommand(
      objects,
      args.command,
      args.data ? JSON.parse(args.data) : []
    )
    console.info(result)
    process.exit()
    return
  }
  const context = repl.start().context
  const toUse = merge({ context: objects }, objects)
  merge(context, objects, toUse)
  console.info(chalk.blue.bold(`Welcome to the shell.`))
  console.info(chalk.blue.bold(`--------------------------------`))
  const helpFunc = help(toUse)
  helpFunc()
  context.help = helpFunc
}

if (esMain(import.meta)) {
  main()
}
