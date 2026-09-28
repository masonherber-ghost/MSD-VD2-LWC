/**
 * Shared reference lists — the closed option sets more than one screen needs.
 *
 * These live here rather than in each screen because a duplicated list drifts:
 * `example/manageOrg` and `example/listAJob` previously carried two DIFFERENT
 * company-type lists for the same `accounts.company_type` column, which is the
 * bug this module exists to prevent.
 *
 * Values are the slugs stored in the database; labels are what the UI shows.
 */

/** `accounts.company_type`. */
export const COMPANY_TYPES = [
    { value: 'registered_company', label: 'Registered company' },
    { value: 'charity', label: 'Charity' },
    { value: 'other', label: 'Something else (like a sole trader)' }
] as const;

/**
 * The role a contact holds at the employer, as the create-a-vacancy flow
 * offers it. Order is the design's, which is not alphabetical.
 *
 * NOTE this is not `contacts.employer_role` (admin / member, which governs
 * permissions). It is the job role, and the column behind it today is
 * `contacts.job_title` — free text, so nothing constrains a stored value to
 * this list. Raised in the handover.
 */
export const CONTACT_ROLES = [
    { value: 'hr_advisor', label: 'HR Advisor' },
    { value: 'manager', label: 'Manager' },
    { value: 'owner', label: 'Owner' },
    { value: 'payroll_accounts', label: 'Payroll/Accounts' },
    { value: 'executive_assistant', label: 'Executive Assistant/Secretary' },
    { value: 'supervisor_foreperson', label: 'Supervisor/Foreperson' },
    { value: 'third_party_contact', label: 'Third Party Contact' },
    { value: 'msd_contact_person', label: 'MSD Contact Person' },
    { value: 'housing_provider_member', label: 'Housing Provider Member' }
] as const;

/** The label for a slug, or the slug itself when it is not in the list. */
export function labelFor(
    list: readonly { value: string; label: string }[],
    value: unknown
): string {
    const slug = String(value ?? '');
    return list.find((o) => o.value === slug)?.label ?? slug;
}
