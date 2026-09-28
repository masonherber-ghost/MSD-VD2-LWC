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
    { value: '3', label: 'Location, terms and pay' },
    { value: '4', label: 'Skills' },
    { value: '5', label: 'About the role' },
    // PLACEHOLDER. The design's rail shows eight dots and names only the
    // current step, so 6 to 8 exist but have no label yet.
    { value: '6', label: 'Step 6' },
    { value: '7', label: 'Step 7' },
    { value: '8', label: 'Step 8' }
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

// --- Step 3: location, terms and pay -----------------------------------------
//
// NOTE on data support. `jobs` covers some of this and not the rest:
//   location, contract_type, start_date, hours_description, pay   EXIST
//   job_schedule.schedule_type                                    EXISTS
//   job_pre_employment_checks.content                             EXISTS
//   workplace arrangement, pay type, pay from/to, hours per week,
//   "show pay in listing"                                         NO COLUMN
// The last group has nowhere to be stored today — see the handover.

/** Where the work happens. No column yet. */
export const WORKPLACE_ARRANGEMENTS = [
    { value: 'on_site', label: 'On-site', description: 'Work at an office or worksite, all of the time.' },
    { value: 'hybrid', label: 'Hybrid', description: 'Flexibility to work from home, some of the time.' },
    { value: 'wfh', label: 'Work from home', description: 'Work from home or anywhere, all of the time.' }
] as const;

/** `jobs.contract_type`. */
export const EMPLOYMENT_TYPES = [
    { value: 'permanent', label: 'Permanent', description: 'Ongoing, no set end date' },
    { value: 'fixed_term', label: 'Fixed-Term', description: 'For a specific period with an agreed end date' },
    { value: 'seasonal', label: 'Seasonal', description: 'For a particular time of year or season' },
    { value: 'casual', label: 'Casual', description: 'No fixed hours, often on an as-needed basis' }
] as const;

/** Drives `jobs.start_date` — "Set date" reveals a date field. */
export const START_OPTIONS = [
    { value: 'immediate', label: 'Immediate start' },
    { value: 'negotiable', label: 'Negotiable' },
    { value: 'set_date', label: 'Set date' }
] as const;

/** Feeds `jobs.hours_description`. */
export const WORK_HOURS = [
    { value: 'full_time', label: 'Full-time', description: '30 hours or more' },
    { value: 'part_time', label: 'Part-time', description: 'Less than 30 hours' }
] as const;

/** `job_schedule.schedule_type`. */
export const WORK_SCHEDULES = [
    { value: 'set', label: 'Set schedule', description: 'Consistent hours and days' },
    { value: 'flexible', label: 'Flexible schedule', description: 'Varied hours and days' }
] as const;

/** Feeds `jobs.pay` (free text). No column of its own. */
export const PAY_TYPES = [
    { value: 'hourly', label: 'Hourly rate' },
    { value: 'salary', label: 'Annual Salary' }
] as const;

/** No column yet. */
export const SHOW_PAY_OPTIONS = [
    { value: 'yes', label: 'Yes', description: 'Show pay on job listing' },
    { value: 'no', label: 'No', description: 'Hide pay on job listing' }
] as const;

/** `job_pre_employment_checks.content`. Copy is the design's, verbatim. */
export const PRE_EMPLOYMENT_CHECKS = [
    { value: 'drug_test', label: "Drug test (Detects drugs in a candidate's urine or saliva sample.)" },
    { value: 'moj_check', label: 'Ministry of Justice check (Checks for official criminal convictions recorded in New Zealand)' },
    { value: 'childrens_worker', label: "Children's Worker Safety Check (Safety check and police vetting for individuals working with children (under 18) as per the Children's Act 2014 and Vulnerable Children Act 2014)" }
] as const;

// --- Step 4: skills ----------------------------------------------------------
//
// Data support:
//   job_skills.skill_name                                    EXISTS
//   job_languages.language_name + job_language_abilities      EXIST (parent/child,
//     which is exactly the design's one-panel-per-language shape)
//   strengths for a JOB                                       NO TABLE — there is
//     only `candidate_strengths`. See the handover.

/** Soft skills for a role. No table to store these in yet. */
export const ROLE_STRENGTHS = [
    { value: 'team', label: 'Working in a team' },
    { value: 'problem_solving', label: 'Problem solving' },
    { value: 'communicating', label: 'Communicating' },
    { value: 'reliable', label: 'Being reliable' },
    { value: 'willing_to_learn', label: 'Willing to Learn' },
    { value: 'leadership', label: 'Showing leadership' },
    { value: 'adapting', label: 'Adapting to change' },
    { value: 'attention_to_detail', label: 'Paying attention to detail' }
] as const;

/** The design caps strengths at four. */
export const MAX_STRENGTHS = 4;

/** `job_language_abilities.ability`. */
export const LANGUAGE_ABILITIES = [
    { value: 'read', label: 'Able to read' },
    { value: 'write', label: 'Able to write' },
    { value: 'converse', label: 'Can have a conversation' },
    { value: 'understand', label: 'Can understand when spoken' }
] as const;

/**
 * PLACEHOLDER. The design shows "Suggested skills for Forklift Driver", i.e. a
 * list derived from the job title chosen on step 2. Nothing in the data
 * produces that — there is no occupation taxonomy — so these are the design's
 * own examples, shown as-is.
 */
export const SUGGESTED_SKILLS = [
    'operate forklift',
    'use telescopic handlers',
    'transport dangerous goods',
    'load and unload freight',
    'complete pre-start checks'
] as const;

/**
 * On-the-job training offered with the role — step 5.
 *
 * NO COLUMN HOLDS THIS. `jobs` has `education_required` and
 * `experience_level`, both of which are about what the candidate arrives with;
 * training is what the employer provides, which is the opposite direction and
 * has nowhere to go. Labels and descriptions are the design's own.
 */
export const TRAINING_LEVELS = [
    {
        value: 'basic',
        label: 'Basic',
        description:
            'Simple job instructions are given. The person should have all the skills ' +
            'for the role from day one.'
    },
    {
        value: 'specific',
        label: 'Specific',
        description: 'Training is given on specific tools or processes for the role.'
    },
    {
        value: 'full',
        label: 'Full',
        description:
            'Full training for the job is given. This is usually for starting-out roles.'
    }
] as const;
