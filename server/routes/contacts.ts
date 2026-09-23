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
