/**
 * Auth for the prototype.
 *
 * Deliberately NOT production auth: there is no session cookie, no token and no
 * server-side session store. These endpoints verify a password and hand the
 * caller the user record; the client keeps it in localStorage and sends the
 * contact id with later requests. Anyone can forge that. It exists to prototype
 * the *flow* — sign in, see an authenticated shell, edit your profile, sign out.
 */
import { Router } from 'express'
import { HttpError } from '../middleware/error-handler.ts'
import { parseId } from '../lib/http.ts'
import * as authRepository from '../repositories/auth-repository.ts'
import { AuthError } from '../repositories/auth-repository.ts'

export const authRouter = Router()

function handle(e: unknown, next: (err?: unknown) => void) {
  next(e instanceof AuthError ? new HttpError(401, e.message) : e)
}

authRouter.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(new HttpError(400, 'Email and password are required.'))
      return
    }
    res.json(authRepository.login(email, password))
  } catch (e) {
    handle(e, next)
  }
})

authRouter.post('/register', (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(new HttpError(400, 'Email and password are required.'))
      return
    }
    res.status(201).json(authRepository.register(req.body))
  } catch (e) {
    // A duplicate email or a weak password is the caller's fault, not a 401.
    next(e instanceof AuthError ? new HttpError(400, e.message) : e)
  }
})

/** Lets the client rehydrate a stored session against the current database. */
authRouter.get('/me/:contactId', (req, res, next) => {
  try {
    const user = authRepository.findUserByContactId(parseId(req.params.contactId, 'contactId'))
    if (!user) {
      next(new HttpError(404, 'No profile for that session.'))
      return
    }
    res.json(user)
  } catch (e) {
    next(e)
  }
})
