import type { Statement } from 'better-sqlite3'
import { db } from '../database.ts'
import { applyUpdate, parseJsonArray, toBool, toInt } from '../lib/sql.ts'
import type { Account, AccountMember, Contact } from '../types.ts'

let selectAccount: Statement | undefined
let selectMembers: Statement | undefined
let selectContact: Statement | undefined
let insertContact: Statement | undefined
let selectContactByInviteEmail: Statement | undefined

const ACCOUNT_UPDATABLE = [
  'company_name', 'industry', 'company_type', 'company_address', 'workplace_address',
  'trading_name', 'ird_number', 'nzbn', 'gst_registered', 'preferred_language',
  'web_address', 'logo_url', 'company_description', 'verified',
  'selling_point_1', 'selling_point_2', 'selling_point_3',
  'campaign_length_weeks', 'max_shortlist', 'interview_options',
  'pre_employment_checks', 'show_company_profile',
  // NOT 'relationship_manager'. MSD assigns it and the portal only displays it,
  // so leaving it out of this list is what makes it read-only — a tampered
  // PATCH cannot set it however the request is shaped. Set it via /data.
] as const

const CONTACT_UPDATABLE = [
  'first_name', 'last_name', 'phone', 'job_title', 'employer_role',
  'invitation_status', 'invite_email', 'account_id',
] as const

function toAccount(row: Record<string, unknown>): Account {
  return {
    ...(row as unknown as Account),
    gst_registered: toBool(row.gst_registered),
    verified: toBool(row.verified),
    show_company_profile: toBool(row.show_company_profile),
    interview_options: parseJsonArray(row.interview_options),
    pre_employment_checks: parseJsonArray(row.pre_employment_checks),
  }
}

export function findAccountById(id: number): Account | null {
  selectAccount ??= db.prepare('SELECT * FROM accounts WHERE id = ?')
  const row = selectAccount.get(id) as Record<string, unknown> | undefined
  return row ? toAccount(row) : null
}

export function updateAccount(id: number, updates: Record<string, unknown>): Account | null {
  const patch = { ...updates }
  // Booleans and JSON arrays are stored as INTEGER / TEXT.
  for (const k of ['gst_registered', 'verified', 'show_company_profile'] as const) {
    if (k in patch) patch[k] = toInt(patch[k] as boolean)
  }
  for (const k of ['interview_options', 'pre_employment_checks'] as const) {
    if (k in patch) patch[k] = JSON.stringify(patch[k] ?? [])
  }
  applyUpdate('accounts', id, patch, ACCOUNT_UPDATABLE)
  return findAccountById(id)
}

/** `first_time` is stored as INTEGER; callers see a boolean. */
function toContact<T extends Record<string, unknown>>(row: T): T & Pick<Contact, 'first_time'> {
  return { ...row, first_time: toBool(row.first_time) }
}

export function findContactById(id: number): Contact | null {
  selectContact ??= db.prepare('SELECT * FROM contacts WHERE id = ?')
  const row = selectContact.get(id) as Record<string, unknown> | undefined
  return row ? (toContact(row) as unknown as Contact) : null
}

/**
 * The person has seen the first-time welcome page. Deliberately its own write,
 * not a CONTACT_UPDATABLE field: the profile form has no business resetting it.
 */
export function markWelcomeSeen(id: number): boolean {
  return db.prepare('UPDATE contacts SET first_time = 0 WHERE id = ?').run(id).changes > 0
}

export function updateContact(id: number, updates: Record<string, unknown>): Contact | null {
  applyUpdate('contacts', id, updates, CONTACT_UPDATABLE)
  return findContactById(id)
}

/**
 * Team members for an account.
 *
 * `invitation_status = 'none'` rows are excluded: those are real people whose
 * details the account holds but who are not portal users. They can still be the
 * primary or secondary contact, so they must exist as contacts rows — they just
 * must not appear in Manage team as a member they never agreed to be.
 */
export function getMembersByAccountId(accountId: number): AccountMember[] {
  selectMembers ??= db.prepare(`
    SELECT
      c.*,
      COALESCE(m.email, c.invite_email) AS email,
      a.contact_id           AS primary_contact_id,
      a.secondary_contact_id AS secondary_contact_id
    FROM contacts c
    LEFT JOIN ciam m     ON c.ciam_id = m.id
    LEFT JOIN accounts a ON a.id = c.account_id
    WHERE c.account_id = ?
      AND c.domain = 'employer'
      AND c.invitation_status != 'none'
    ORDER BY c.id
  `)

  const rows = selectMembers.all(accountId) as (Contact & {
    email: string | null
    primary_contact_id: number | null
    secondary_contact_id: number | null
  })[]

  return rows.map(({ primary_contact_id, secondary_contact_id, ...contact }) => ({
    ...toContact(contact as unknown as Record<string, unknown>) as unknown as Contact & { email: string | null },
    is_primary_contact: primary_contact_id === contact.id,
    is_secondary_contact: secondary_contact_id === contact.id,
  }))
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

/** Adds a team member. Existing portal users are linked; new ones become pending invites. */
export function addMember(
  accountId: number,
  input: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    job_title?: string | null
    invite_email: string
    employer_role?: 'admin' | 'member'
    invite: boolean
  },
): AccountMember {
  insertContact ??= db.prepare(`
    INSERT INTO contacts
      (ciam_id, domain, employer_role, invitation_status, invite_email,
       account_id, first_name, last_name, phone, job_title)
    VALUES (?, 'employer', ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id
  `)
  selectContactByInviteEmail ??= db.prepare(`
    SELECT c.id FROM contacts c
    LEFT JOIN ciam m ON c.ciam_id = m.id
    WHERE c.account_id = ? AND (c.invite_email = ? OR m.email = ?)
  `)

  // Captured as locals: TS cannot narrow a module-level `let` inside a closure.
  const findByEmail = selectContactByInviteEmail
  const insert = insertContact

  const run = db.transaction((): number => {
    const existing = findByEmail.get(
      accountId, input.invite_email, input.invite_email,
    ) as { id: number } | undefined
    if (existing) {
      throw new DomainError('This person is already a member of this account.')
    }

    // An uninvited contact is a real person we hold details for, but not a
    // portal user — 'none' keeps them out of Manage team.
    const status = input.invite ? 'pending' : 'none'
    const row = insert.get(
      null, input.employer_role ?? 'member', status, input.invite_email,
      accountId, input.first_name ?? null, input.last_name ?? null,
      input.phone ?? null, input.job_title ?? null,
    ) as { id: number }
    return row.id
  })

  const id = run()
  const member = getMembersByAccountId(accountId).find((m) => m.id === id)
  if (member) return member

  // An uninvited ('none') contact is filtered out of the members list by design.
  const contact = findContactById(id)!
  return { ...contact, email: contact.invite_email, is_primary_contact: false, is_secondary_contact: false }
}

export function changeMemberRole(
  contactId: number,
  employerRole: 'admin' | 'member',
): Contact | null {
  return updateContact(contactId, { employer_role: employerRole })
}

/**
 * Sets the authorised (primary) contact and the secondary in one write.
 *
 * Both slots move together so the pair can never be half-applied: the slot
 * reflects authority, not who created the account, so promoting someone else to
 * primary demotes the current holder to secondary.
 */
export function setAuthorisedContact(
  accountId: number,
  primaryContactId: number,
  secondaryContactId: number | null,
): Account | null {
  const run = db.transaction(() => {
    db.prepare(
      `UPDATE accounts
          SET contact_id = ?, secondary_contact_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
    ).run(primaryContactId, secondaryContactId, accountId)
  })
  run()
  return findAccountById(accountId)
}

export function removeMember(accountId: number, contactId: number): boolean {
  const run = db.transaction((): boolean => {
    const account = findAccountById(accountId)
    if (account?.contact_id === contactId) {
      throw new DomainError('The primary contact cannot be removed. Assign a new one first.')
    }
    // Clear the secondary pointer rather than relying on ON DELETE SET NULL,
    // so the account row's updated_at moves too.
    if (account?.secondary_contact_id === contactId) {
      db.prepare('UPDATE accounts SET secondary_contact_id = NULL WHERE id = ?').run(accountId)
    }
    const result = db
      .prepare('DELETE FROM contacts WHERE id = ? AND account_id = ?')
      .run(contactId, accountId)
    return result.changes > 0
  })
  return run()
}
