import type { ErrorRequestHandler, RequestHandler } from 'express'

export class HttpError extends Error {
  // Declared explicitly rather than as a constructor parameter property —
  // erasableSyntaxOnly disallows the shorthand.
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  // originalUrl, not path: inside a router mounted at /api, req.path is
  // relative, so the message would read "/nope" instead of "/api/nope".
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500
  const message =
    err instanceof HttpError ? err.message : 'Something went wrong on the server.'

  // Log the real error server-side; never leak internals to the client.
  if (status >= 500) console.error('[error]', err)

  res.status(status).json({ error: message })
}
