import {logToLoki} from './lokiLogger'

let handlersAttached = false

export function setupProcessLogging() {
  if (handlersAttached) return
  handlersAttached = true

  const logUnhandled = (type: 'unhandledRejection' | 'uncaughtException', err: unknown) =>
    logToLoki(
      'error',
      type,
      {kind: 'process'},
      err instanceof Error ? {message: err.message, stack: err.stack} : {error: String(err)},
    ).catch(() => {
    })

  process.on('unhandledRejection', (reason) => {
    void logUnhandled('unhandledRejection', reason)
  })

  process.on('uncaughtException', (err) => {
    void logUnhandled('uncaughtException', err)
  })
}
