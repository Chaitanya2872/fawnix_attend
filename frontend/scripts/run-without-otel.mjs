#!/usr/bin/env node
import { spawn } from 'node:child_process'

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Usage: node scripts/run-without-otel.mjs <command> [...args]')
  process.exit(1)
}

const env = {
  ...process.env,
  OTEL_SDK_DISABLED: 'true',
  OTEL_TRACES_EXPORTER: 'none',
  OTEL_METRICS_EXPORTER: 'none',
  OTEL_LOGS_EXPORTER: 'none'
}

const child =
  process.platform === 'win32'
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', quoteForCmd([command, ...args])], {
        env,
        stdio: 'inherit'
      })
    : spawn(command, args, {
        env,
        stdio: 'inherit'
      })

child.on('error', (error) => {
  console.error(`Failed to run "${command}": ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  }

  process.exit(code ?? 0)
})

function quoteForCmd(parts) {
  return parts.map((part) => {
    if (!/[ \t&()^%!<>"|]/.test(part)) {
      return part
    }

    return `"${part.replace(/"/g, '\\"').replace(/%/g, '%%')}"`
  }).join(' ')
}
