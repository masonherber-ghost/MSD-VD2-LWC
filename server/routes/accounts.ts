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

/** Org details. ACCOUNT_UPDATABLE in the repository is the allow-list. */
accountsRouter.patch('/:id', (req, res, next) => {
  try {
    const account = accountRepository.updateAccount(parseId(req.params.id), req.body ?? {})
    if (!account) {
      next(new HttpError(404, 'Account not found.'))
      return
    }
    res.json(account)
  } catch (e) {
    handle(e, next)
  }
})

// --- Team members -----------------------------------------------------------

accountsRouter.post('/:id/members', (req, res, next) => {
  try {
    const { invite_email } = req.body ?? {}
    if (typeof invite_email !== 'string' || !invite_email.includes('@')) {
      next(new HttpError(400, 'A valid invite_email is required.'))
      return
    }
    res.status(201).json(
      accountRepository.addMember(parseId(req.params.id), {
        ...req.body,
        employer_role: req.body.employer_role === 'admin' ? 'admin' : 'member',
        invite: req.body.invite !== false,
      }),
    )
  } catch (e) {
    handle(e, next)
  }
})

accountsRouter.patch('/:id/members/:contactId/role', (req, res, next) => {
  try {
    const role = req.body?.employer_role
    if (role !== 'admin' && role !== 'member') {
      next(new HttpError(400, "employer_role must be 'admin' or 'member'."))
      return
    }
    const accountId = parseId(req.params.id)
    const contactId = parseId(req.params.contactId, 'contactId')

    // The primary contact is the account's authority, so they must stay an
    // Admin. Enforced here as well as in the UI, which only hides the action.
    if (role === 'member' && accountRepository.findAccountById(accountId)?.contact_id === contactId) {
      next(
        new HttpError(
          400,
          'The primary contact must be an Admin. Assign a new primary contact first.',
        ),
      )
      return
    }

    const contact = accountRepository.changeMemberRole(contactId, role)
    if (!contact) {
      next(new HttpError(404, 'Member not found.'))
      return
    }
    res.json(contact)
  } catch (e) {
    handle(e, next)
  }
})

/** Primary and secondary move together — see setAuthorisedContact. */
accountsRouter.patch('/:id/authorised-contact', (req, res, next) => {
  try {
    const { primary_contact_id, secondary_contact_id = null } = req.body ?? {}
    const account = accountRepository.setAuthorisedContact(
      parseId(req.params.id),
      parseId(String(primary_contact_id), 'primary_contact_id'),
      secondary_contact_id === null ? null : parseId(String(secondary_contact_id), 'secondary_contact_id'),
    )
    if (!account) {
      next(new HttpError(404, 'Account not found.'))
      return
    }
    res.json(account)
  } catch (e) {
    handle(e, next)
  }
})

accountsRouter.delete('/:id/members/:contactId', (req, res, next) => {
  try {
    const removed = accountRepository.removeMember(
      parseId(req.params.id),
      parseId(req.params.contactId, 'contactId'),
    )
    if (!removed) {
      next(new HttpError(404, 'Member not found.'))
      return
    }
    res.json({ removed: parseId(req.params.contactId, 'contactId') })
  } catch (e) {
    handle(e, next)
  }
})
