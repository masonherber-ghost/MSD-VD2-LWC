/** A person's own record — the profile screen reads and writes through here. */
import { Router } from 'express'
import { HttpError } from '../middleware/error-handler.ts'
import { parseId } from '../lib/http.ts'
import * as accountRepository from '../repositories/account-repository.ts'
import { DomainError } from '../repositories/account-repository.ts'

export const contactsRouter = Router()

contactsRouter.get('/:id', (req, res, next) => {
  try {
    const contact = accountRepository.findContactById(parseId(req.params.id))
    if (!contact) {
      next(new HttpError(404, 'Contact not found.'))
      return
    }
    res.json(contact)
  } catch (e) {
    next(e)
  }
})

/** CONTACT_UPDATABLE in the repository is the allow-list, so role and account
 *  pointers cannot be escalated from the profile form. */
contactsRouter.patch('/:id', (req, res, next) => {
  try {
    const contact = accountRepository.updateContact(parseId(req.params.id), req.body ?? {})
    if (!contact) {
      next(new HttpError(404, 'Contact not found.'))
      return
    }
    res.json(contact)
  } catch (e) {
    next(e instanceof DomainError ? new HttpError(400, e.message) : e)
  }
})

/** The first-time welcome page has been seen. Idempotent: a second call is a no-op. */
contactsRouter.post('/:id/welcome-seen', (req, res, next) => {
  try {
    if (!accountRepository.markWelcomeSeen(parseId(req.params.id))) {
      next(new HttpError(404, 'Contact not found.'))
      return
    }
    // JSON, not 204: `data/api` reads a non-JSON response as "no API in this build".
    res.json({ first_time: false })
  } catch (e) {
    next(e)
  }
})
