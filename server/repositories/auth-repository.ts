import { db } from '../database.ts'
import { hashPassword, verifyPassword } from '../lib/password.ts'
import type { Contact } from '../types.ts'

/** What the client gets back on a successful login or registration. */
export interface AuthUser {
  contact_id: number
  ciam_id: number
  email: string
  first_name: string | null
  last_name: string | null
  job_title: string | null
  phone: string | null
  account_id: number | null
  employer_role: string | null
  company_name: string | null
}

export class AuthError extends Error {}

const SELECT_USER = `
  SELECT c.id        AS contact_id,
         ci.id       AS ciam_id,
         ci.email    AS email,
         c.first_name, c.last_name, c.job_title, c.phone,
         c.account_id, c.employer_role,
         a.company_name
    FROM ciam ci
    JOIN contacts c ON c.ciam_id = ci.id
    LEFT JOIN accounts a ON a.id = c.account_id
`

export function findUserByContactId(contactId: number): AuthUser | null {
  return (db.prepare(`${SELECT_USER} WHERE c.id = ?`).get(contactId) as AuthUser) ?? null
}

/**
 * Verifies an email and password against ciam and returns the linked contact.
 *
 * A ciam row with no contact cannot sign in: every screen in this app is scoped
 * by contact and account, so a login with nothing behind it has nowhere to go.
 */
export function login(email: string, password: string): AuthUser {
  const row = db
    .prepare('SELECT id, email, password_hash, password_salt FROM ciam WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | { id: number; email: string; password_hash: string; password_salt: string }
    | undefined

  // Same message either way, so the form cannot be used to enumerate emails.
  if (!row || !verifyPassword(password, row.password_hash, row.password_salt)) {
    throw new AuthError('Email or password is incorrect.')
  }

  const user = db.prepare(`${SELECT_USER} WHERE ci.id = ?`).get(row.id) as AuthUser | undefined
  if (!user) {
    throw new AuthError('This login has no profile attached. Contact your administrator.')
  }
  return user
}

export interface RegisterInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  job_title?: string
  phone?: string
  company_name?: string
}

/**
 * Creates a login and the contact behind it, plus an account when a company
 * name is given — a self-registering employer is the first person on a new
 * account, so there is nothing to join them to.
 */
export function register(input: RegisterInput): AuthUser {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) {
    throw new AuthError('Enter a valid email address.')
  }
  if (!input.password || input.password.length < 8) {
    throw new AuthError('Password must be at least 8 characters.')
  }
  if (db.prepare('SELECT 1 FROM ciam WHERE email = ?').get(email)) {
    throw new AuthError('An account with that email already exists.')
  }

  const { hash, salt } = hashPassword(input.password)

  const run = db.transaction((): number => {
    const { id: ciamId } = db
      .prepare(
        'INSERT INTO ciam (email, password_hash, password_salt) VALUES (?, ?, ?) RETURNING id',
      )
      .get(email, hash, salt) as { id: number }

    let accountId: number | null = null
    if (input.company_name?.trim()) {
      const { id } = db
        .prepare('INSERT INTO accounts (company_name) VALUES (?) RETURNING id')
        .get(input.company_name.trim()) as { id: number }
      accountId = id
    }

    const { id: contactId } = db
      .prepare(`
        INSERT INTO contacts
          (ciam_id, domain, employer_role, invitation_status, account_id,
           first_name, last_name, job_title, phone)
        VALUES (?, 'employer', 'admin', 'active', ?, ?, ?, ?, ?)
        RETURNING id
      `)
      .get(
        ciamId,
        accountId,
        input.first_name?.trim() ?? null,
        input.last_name?.trim() ?? null,
        input.job_title?.trim() ?? null,
        input.phone?.trim() ?? null,
      ) as { id: number }

    // The registering employer is their own account's primary contact.
    if (accountId) {
      db.prepare('UPDATE accounts SET contact_id = ? WHERE id = ?').run(contactId, accountId)
    }
    return contactId
  })

  return findUserByContactId(run())!
}

export type { Contact }
