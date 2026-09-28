/**
 * The vacancy being created or edited, carried across the seven step routes.
 *
 * WHY THIS EXISTS NOW. Each `/create-job/stepN` is its own document, so until
 * this module the steps could not share anything: every step started blank,
 * step 7 had nothing real to preview, and "Edit this vacancy" had nowhere to
 * put the record it was editing. All three are the same missing piece.
 *
 * `sessionStorage`, for the same reasons as `data/flash`: the draft must
 * survive six navigations but not the browsing session, and must not appear in
 * another tab where someone is editing a different vacancy. It is NOT a save —
 * nothing reaches the database until the flow's last step, and today not even
 * then.
 *
 * KEYED BY COLUMN NAME wherever a column exists, so a step reads and writes the
 * same name the database uses and `toJobShape` is close to a pass-through. The
 * handful of keys with no column are listed in FLOW_ONLY below, named there
 * rather than discovered later by a developer wondering where the value went.
 *
 * THE REACTIVITY RULE APPLIES. A getter that calls `current()` reads this
 * module, not a field, so LWC records no dependency and the screen will not
 * re-render when the draft changes. Every step therefore copies the draft into
 * a FIELD on connect and reassigns that field — see `rules-app-logic.md`
 * § The reactivity rule.
 */

import {
    EXPERIENCE_LEVELS,
    EDUCATION_LEVELS,
    EMPLOYMENT_TYPES
} from 'data/reference';

type Row = Record<string, unknown>;

export interface JobLanguageDraft {
    name: string;
    abilities: string[];
}

export interface JobDraft {
    /** The vacancy being edited, or null when this is a new one. */
    job_id: number | null;

    // Step 2 — the role
    title: string;
    occupation_id: string;
    experience_level: string;
    education_required: string;
    certification: string;
    /** `job_driver_licences.stage`, keyed by class value. */
    driver_licence_stages: Record<string, string>;
    licence_endorsements: string[];

    // Step 3 — location, terms and pay
    workplace_arrangement: string;
    contract_type: string;
    start_option: string;
    start_date: string;
    work_hours: string;
    hours_per_week: string;
    schedule_type: string;
    pay_type: string;
    pay_from: string;
    pay_to: string;
    show_pay: string;
    pre_employment_checks: string[];

    // Step 4 — skills
    skills: string[];
    strengths: string[];
    languages: JobLanguageDraft[];

    // Step 5 — about the role
    description: string;
    selling_points: string[];
    training_level: string;

    // Step 6 — managing the listing
    publish_timing: string;
    posted_date: string;
    positions_available: string;
    max_shortlist: string;
    interview_options: string[];
}

/**
 * Draft keys NO column holds. Each is collected by the flow and then has
 * nowhere to go; all have been reported as gaps on the step that collects them.
 *
 *   occupation_id          step 2 — no occupation taxonomy
 *   workplace_arrangement  step 3
 *   pay_type/from/to       step 3 — `jobs.pay` is one free-text column
 *   show_pay               step 3
 *   hours_per_week         step 3 — `jobs.hours_description` is free text
 *   strengths              step 4 — no job strengths table
 *   training_level         step 5
 *   publish_timing         step 6 — implied by whether `posted_date` is set
 */
export const FLOW_ONLY = [
    'occupation_id',
    'workplace_arrangement',
    'pay_type',
    'pay_from',
    'pay_to',
    'show_pay',
    'hours_per_week',
    'strengths',
    'training_level',
    'publish_timing'
] as const;

const KEY = 'msd.jobDraft';
const EVENT = 'msd-job-draft-change';

export function blankDraft(): JobDraft {
    return {
        job_id: null,
        title: '',
        occupation_id: '',
        experience_level: '',
        education_required: '',
        certification: '',
        driver_licence_stages: {},
        licence_endorsements: [],
        workplace_arrangement: '',
        contract_type: '',
        start_option: '',
        start_date: '',
        work_hours: '',
        hours_per_week: '',
        schedule_type: '',
        pay_type: '',
        pay_from: '',
        pay_to: '',
        // The design ships this one pre-selected.
        show_pay: 'yes',
        pre_employment_checks: [],
        skills: [],
        strengths: [],
        languages: [],
        description: '',
        selling_points: [],
        training_level: '',
        publish_timing: 'asap',
        posted_date: '',
        positions_available: '1',
        max_shortlist: '10',
        interview_options: []
    };
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/**
 * Resolve a stored value against one of the flow's closed lists.
 *
 * THE SEEDED ROWS AND THE FLOW DISAGREE. `jobs.experience_level` and
 * `jobs.contract_type` hold display text on every seeded vacancy — "Permanent
 * contract", "No experience required" — while the flow writes the slug the
 * option list defines. A slug lookup alone therefore leaves those controls
 * blank on an edit, which reads as data loss.
 *
 * So the value is tried, then the LABEL, case-insensitively. Nothing is
 * guessed: text matching neither comes back empty, and the step shows its
 * unselected state. "3+ years in maintenance/finishing" is not one of the five
 * experience bands and no amount of matching will make it one.
 */
function resolveOption(
    list: readonly { value: string; label: string }[],
    stored: unknown
): string {
    const text = str(stored).trim();
    if (!text) return '';
    const lower = text.toLowerCase();
    return (
        list.find((o) => o.value === text)?.value ??
        list.find((o) => o.label.toLowerCase() === lower)?.value ??
        ''
    );
}
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);

/** Storage can throw (private mode, disabled cookies) — never break a render. */
function read(): JobDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.sessionStorage.getItem(KEY);
        return raw ? ({ ...blankDraft(), ...JSON.parse(raw) } as JobDraft) : null;
    } catch {
        return null;
    }
}

function write(draft: JobDraft): void {
    try {
        window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
        // A draft that cannot persist still works for this page view.
    }
    broadcast();
}

function broadcast(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT));
    }
}

/** The draft in progress, or a blank one. Never null, so callers need no guard. */
export function current(): JobDraft {
    return read() ?? blankDraft();
}

export function hasDraft(): boolean {
    return read() !== null;
}

/** True when the flow was entered from an existing vacancy's Edit action. */
export function editingJobId(): number | null {
    return read()?.job_id ?? null;
}

/** Merge fields into the draft. Absent keys are left alone, never nulled. */
export function patch(fields: Partial<JobDraft>): void {
    write({ ...current(), ...fields });
}

export function clear(): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.removeItem(KEY);
    } catch {
        // Nothing to undo.
    }
    broadcast();
}

export function startBlank(): void {
    write(blankDraft());
}

/**
 * Seed the flow from a hydrated vacancy — what "Edit" on the record page does.
 *
 * `job` is a `JobDetail`: the row with every child collection already attached.
 * Fields with no column arrive empty and the step that owns them shows its
 * placeholder, which is the honest result — the vacancy genuinely does not hold
 * a training level or a workplace arrangement, so pretending otherwise would be
 * inventing data on an edit screen.
 */
export function startFromJob(job: Row): void {
    const schedule = (job.schedule as Row) ?? {};

    const stages: Record<string, string> = {};
    for (const licence of (job.driver_licences as Row[]) ?? []) {
        const value = str(licence.class_value);
        if (value) {
            stages[value] = str(licence.stage);
        }
    }

    write({
        ...blankDraft(),
        job_id: Number(job.id),

        title: str(job.title),
        experience_level: resolveOption(EXPERIENCE_LEVELS, job.experience_level),
        education_required: resolveOption(EDUCATION_LEVELS, job.education_required),
        // `certificates` is the child table; the step asks for one line of text.
        certification: list(job.certificates).join(', '),
        driver_licence_stages: stages,
        licence_endorsements: list(job.licence_endorsements),

        contract_type: resolveOption(EMPLOYMENT_TYPES, job.contract_type),
        start_date: str(job.start_date),
        // A date on the record means the start was scheduled, not immediate.
        start_option: str(job.start_date) ? 'set_date' : '',
        work_hours: str(schedule.hours),
        schedule_type: str(schedule.schedule_type),
        pre_employment_checks: list(job.pre_employment_checks),

        skills: list(job.skills),
        languages: ((job.languages as Row[]) ?? []).map((l) => ({
            name: str(l.language_name),
            abilities: list(l.abilities)
        })),

        description: str(job.description),
        selling_points: list(job.selling_points),

        publish_timing: str(job.posted_date) ? 'scheduled' : 'asap',
        posted_date: str(job.posted_date),
        positions_available: str(job.positions_available ?? '1'),
        max_shortlist: str(job.max_shortlist ?? '10'),
        interview_options: list(job.interview_options)
    });
}

/**
 * The draft as `ui/jobListingPreview` expects it — the `JobDetail` shape.
 *
 * Step 7 previews what the employer has actually entered rather than re-reading
 * the saved record, so an edit made on step 5 shows up on step 7 before
 * anything is submitted.
 *
 * `pay` and `hours_description` are assembled here because the flow collects
 * them in parts (`pay_from`/`pay_to`, `hours_per_week`) while the table holds
 * one free-text column each. That assembly is a guess at MSD's format and is
 * the reason those keys are in FLOW_ONLY.
 */
export function toJobShape(draft: JobDraft, job: Row | null = null): Row {
    const pay =
        draft.pay_from && draft.pay_to
            ? `$${draft.pay_from} - ${draft.pay_to}`
            : draft.pay_from
              ? `$${draft.pay_from}`
              : str(job?.pay);

    return {
        ...(job ?? {}),
        id: draft.job_id,
        title: draft.title,
        description: draft.description,
        contract_type: draft.contract_type,
        start_date: draft.start_date,
        experience_level: draft.experience_level,
        education_required: draft.education_required,
        pay,
        hours_description: draft.hours_per_week
            ? `${draft.hours_per_week} hours per week`
            : str(job?.hours_description),
        positions_available: draft.positions_available,
        max_shortlist: draft.max_shortlist,
        posted_date: draft.posted_date,
        interview_options: draft.interview_options,

        selling_points: draft.selling_points,
        pre_employment_checks: draft.pre_employment_checks,
        skills: draft.skills,
        certificates: draft.certification
            ? draft.certification.split(',').map((c) => c.trim()).filter(Boolean)
            : [],
        licence_endorsements: draft.licence_endorsements,
        languages: draft.languages.map((l) => ({
            language_name: l.name,
            abilities: l.abilities
        })),
        driver_licences: Object.entries(draft.driver_licence_stages)
            .filter(([, stage]) => stage && stage !== 'none')
            .map(([value, stage]) => ({
                class_value: value,
                class_label: value,
                stage
            })),
        schedule: {
            schedule_type: draft.schedule_type,
            hours: draft.work_hours,
            additional_info: str((job?.schedule as Row)?.additional_info),
            days: list((job?.schedule as Row)?.days)
        }
    };
}

/** Subscribe to draft changes. Returns the unsubscribe. */
export function onChange(handler: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
}
