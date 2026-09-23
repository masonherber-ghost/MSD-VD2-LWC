import { Router } from 'express'
import { HttpError } from '../middleware/error-handler.ts'
import { parseId } from '../lib/http.ts'
import * as accountRepository from '../repositories/account-repository.ts'
import { DomainError } from '../repositories/account-repository.ts'

export const accountsRouter = Router()

/** Domain errors from the repository are the caller's fault, not the server's. */
function handle(e: unknown, next: (err?: unknown) => void) {
  next(e instanceof DomainError ? new HttpError(400, e.message) : e)
}

accountsRouter.get('/:id', (req, res, next) => {
  try {
    const account = accountRepository.findAccountById(parseId(req.params.id))
    if (!account) {
      next(new HttpError(404, 'Account not found.'))
      return
    }
    res.json(account)
  } catch (e) {
    next(e)
  }
})

// --- Team members -----------------------------------------------------------

accountsRouter.get('/:id/members', (req, res, next) => {
  try {
    res.json(accountRepository.getMembersByAccountId(parseId(req.params.id)))
  } catch (e) {
    next(e)
  }
})

// --- Contacts ---------------------------------------------------------------
