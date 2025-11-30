import {logToLoki} from './lokiLogger'

const SAMPLE_RATE = Number(process.env.LOG_CONSOLE_SAMPLE_RATE ?? '0.1')

function shouldSample() {
  return Math.random() < SAMPLE_RATE
}

export function bridgeConsole() {
  if (typeof console === 'undefined') return

  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args: unknown[]) => {
    if (shouldSample()) {
      void logToLoki('error', 'console_error', {kind: 'request'}, {args})
    }
    originalError(...args)
  }

  console.warn = (...args: unknown[]) => {
    if (shouldSample()) {
      void logToLoki('warn', 'console_warn', {kind: 'request'}, {args})
    }
    originalWarn(...args)
  }
}
