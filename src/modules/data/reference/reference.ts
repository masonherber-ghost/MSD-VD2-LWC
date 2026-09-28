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

/**
 * The create-a-vacancy flow's steps, one route each (`/create-job/stepN`).
 *
 * PLACEHOLDER labels for steps 3-7: the designs supplied so far cover steps 1
 * and 2 only. `lightning-progress-indicator type="base"` shows a label in its
 * tooltip only, so these are low-visibility, but they are still guesses.
 */
export const VACANCY_STEPS = [
    { value: '1', label: 'Company details' },
    { value: '2', label: 'Job details' },
    { value: '3', label: 'Step 3' },
    { value: '4', label: 'Step 4' },
    { value: '5', label: 'Step 5' },
    { value: '6', label: 'Step 6' },
    { value: '7', label: 'Step 7' }
] as const;

export function labelForStep(value: string): string {
    return VACANCY_STEPS.find((s) => s.value === value)?.label ?? '';
}

/**
 * Minimum experience for a vacancy — `jobs.experience_level`.
 * Labels and order are the design's.
 */
export const EXPERIENCE_LEVELS = [
    { value: 'none', label: 'No experience required' },
    { value: '0_6_months', label: '0 - 6 months' },
    { value: '6_months_2_years', label: '6 months - 2 years' },
    { value: '2_4_years', label: '2 - 4 years' },
    { value: '4_years_plus', label: '4 years +' }
] as const;

/**
 * NZ driver licence classes — `job_driver_licences.class_value` / `class_label`.
 * Labels are the design's, which match the real NZTA class names.
 */
export const DRIVER_LICENCE_CLASSES = [
    { value: 'class_1', label: 'Class 1 - Car Licence' },
    { value: 'class_2', label: 'Class 2 - Medium Rigid Vehicle Licence' },
    { value: 'class_3', label: 'Class 3 - Medium Combination Vehicle Licence' },
    { value: 'class_4', label: 'Class 4 - Heavy Rigid Vehicle Licence' },
    { value: 'class_5', label: 'Class 5 - Heavy Combination Vehicle Licence' },
    { value: 'class_6', label: 'Class 6 - Motorcycle Licence' }
] as const;

/** Licence endorsements — `job_licence_endorsements.endorsement`. */
export const LICENCE_ENDORSEMENTS = [
    { value: 'P', label: '(P) - Passenger' },
    { value: 'I', label: '(I) - Driving Instructor' },
    { value: 'O', label: '(O) - Testing Officer' },
    { value: 'V', label: '(V) - Vehicle Recovery' },
    { value: 'D', label: '(D) - Dangerous Goods' },
    { value: 'F', label: '(F) - Forklift' },
    { value: 'T', label: '(T) - Tracks' },
    { value: 'R', label: '(R) - Roller' },
    { value: 'W', label: '(W) - Wheels (Special Type)' }
] as const;

/**
 * PLACEHOLDER — `jobs.education_required` is free text and the design shows an
 * empty dropdown, so nothing in the data defines this list.
 */
export const EDUCATION_LEVELS = [
    { value: 'none', label: 'No formal education required' },
    { value: 'ncea_1', label: 'NCEA Level 1' },
    { value: 'ncea_2', label: 'NCEA Level 2' },
    { value: 'ncea_3', label: 'NCEA Level 3' },
    { value: 'certificate', label: 'Certificate or diploma' },
    { value: 'degree', label: 'Bachelor degree or higher' }
] as const;

/**
 * Licence stage for a selected class — `job_driver_licences.stage`.
 *
 * The column existed before this screen was designed, which is what gave away
 * that the class pills expand rather than toggle: a class is not a yes/no, it
 * carries a stage. Labels are the design's.
 */
export const LICENCE_STAGES = [
    { value: 'none', label: 'None' },
    { value: 'learners', label: 'Learners' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'full', label: 'Full' }
] as const;
