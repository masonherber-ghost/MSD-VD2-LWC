import { isEnabled, type Release } from 'data/release';

/**
 * What a vacancy list needs to know about vacancies, independent of how it
 * draws them.
 *
 * Shared rather than duplicated: `example/jobs` renders the account's vacancies
 * as cards and `example/jobs2` as a datatable, and the two must agree on the
 * filters, the status labels and which actions a state offers. A rule that
 * exists twice is a rule that will eventually differ — the same reasoning as
 * `data/reference` and `data/jobIcons`.
 */

/**
 * The filter set above the list. `status` is matched against the `jobs.status`
 * column; `all` matches everything.
 *
 * The labels are the ones on the wireframe. Note they are not the vocabulary
 * the rest of the app uses — a card badge for the same record reads "Active",
 * not "Published".
 */
export const JOB_FILTERS: { value: string; label: string; status?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Published', status: 'active' },
    { value: 'draft', label: 'Drafts', status: 'draft' },
    { value: 'in_review', label: 'Pending review', status: 'in_review' },
    { value: 'closed', label: 'Closed', status: 'closed' }
];

export const JOB_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In review',
    active: 'Active',
    closed: 'Closed'
};

/** `draft` -> `in_review` -> `active` -> `closed`, for sorting by lifecycle. */
export const JOB_STATUS_ORDER = ['draft', 'in_review', 'active', 'closed'];

/**
 * Shown on a vacancy the employer has submitted and cannot yet edit.
 *
 * Deliberately says nothing about how long review takes — the design's copy
 * quotes 24 hours, and nothing in the data or the rules backs that up.
 */
export const IN_REVIEW_NOTICE = 'This vacancy is with MSD for review.';

/**
 * Filtering runs in memory rather than through the API. The account's
 * vacancies are already loaded, so matching is instant and costs no request
 * per keystroke. `job-repository.findByAccount` does take `status` and
 * `contact_id` filters if a list ever grows past one page.
 */
export function filterJobs<T extends Record<string, unknown>>(
    jobs: T[],
    filter: string,
    search: string
): T[] {
    const selected = JOB_FILTERS.find((f) => f.value === filter);
    const term = search.trim().toLowerCase();

    return jobs.filter((j) => {
        if (selected?.status && String(j.status ?? '') !== selected.status) {
            return false;
        }
        if (term && !String(j.title ?? '').toLowerCase().includes(term)) {
            return false;
        }
        return true;
    });
}

export interface VacancyAction {
    key: string;
    label: string;
    icon: string;
}

/**
 * The vacancy actions this app offers, named once.
 *
 * The verbs are `example/jobDetail`'s own header menu — Edit, Clone, Close —
 * plus Submit, the draft -> in_review transition the create flow's last step
 * performs. Discard is jobDetail's Delete under the label this list uses: on a
 * list the thing being thrown away is the employer's own listing, and
 * "Discard" says that without reading as a database operation.
 */
const EDIT: VacancyAction = { key: 'edit', label: 'Edit', icon: 'utility:edit' };
const SUBMIT: VacancyAction = { key: 'submit', label: 'Submit', icon: 'utility:upload' };
const DISCARD: VacancyAction = { key: 'discard', label: 'Discard', icon: 'utility:delete' };
const CLOSE: VacancyAction = { key: 'close', label: 'Close', icon: 'utility:close' };
const CLONE: VacancyAction = { key: 'clone', label: 'Clone', icon: 'utility:copy' };

/**
 * What an employer may do to a vacancy, by lifecycle state and release.
 *
 * `draft` -> `in_review` -> `active` -> `closed` (`rules-app-logic.md`
 * § Vacancy lifecycle).
 *
 * `in_review` has none on purpose: the vacancy is with MSD, and withdrawing it
 * is a transition neither the lifecycle nor the data models.
 *
 * Two are release-gated, so the set is a function of both and not a lookup.
 * `release` is passed in rather than read from the module — the caller holds it
 * in a field, which is what makes the toggle re-render the list. See
 * `rules-app-logic.md` § The reactivity rule.
 *
 * Still unwired, as `example/jobDetail`'s own header actions are — this decides
 * WHICH actions a state offers, not what they do.
 */
export function actionsFor(status: string, release: Release): VacancyAction[] {
    switch (status) {
        case 'draft':
            return [EDIT, SUBMIT, DISCARD];
        case 'in_review':
            return [];
        case 'active':
            return isEnabled('jobs.editActive', release) ? [EDIT, CLOSE] : [CLOSE];
        // Re-listing a finished vacancy is a clone, not an edit: the closed
        // record stays as the account's history of it.
        case 'closed':
            return isEnabled('jobs.cloneClosed', release) ? [CLONE, DISCARD] : [DISCARD];
        // A state the lifecycle does not name is one whose transitions are
        // unknown, so it offers nothing rather than a draft's set.
        default:
            return [];
    }
}

/**
 * Why a vacancy offers no actions, for the one disabled line its menu shows
 * instead. An empty menu reads as broken — the rule `example/manageOrg` follows
 * for the primary contact (`rules-app-logic.md` § The primary contact).
 */
export function noActionsReason(status: string): string {
    return status === 'in_review' ? 'With MSD for review' : 'No actions available';
}

/**
 * The closing date as a sentence that says what the date IS.
 *
 * `jobs.closing_date` is free text — "Next Month", "Closes 25 May 2025" — so a
 * bare value reads as "Next Month" with nothing to say what happens then. The
 * field only ever holds the closing date, so the wording names it. A value
 * that already starts with "Closes" has it stripped first rather than
 * repeated. Shared by the `/jobs` cards and the job detail header.
 *
 * Two shapes, because the column holds both:
 *   - a calendar date (anything with a digit) reads "Closes on 25 May 2025",
 *     or "Closed on 25 May 2025" once the vacancy is closed;
 *   - a relative phrase cannot take "on" — "Closes on next month" is not
 *     English — so it reads "Closes next month", lowercased to sit in the
 *     sentence, or "Closing date: next month" when closed ("Closed next
 *     month" would be nonsense).
 *
 * Nothing here turns a phrase into a date. The seed holds "Next Month" on
 * three of four vacancies; until the data holds real dates, those read as a
 * phrase.
 */
export function closingText(status: string, value: unknown): string {
    let text = String(value ?? '').trim().replace(/^closes\s+/i, '');
    if (!text) return '';
    const closed = status === 'closed';
    if (/\d/.test(text)) {
        return closed ? `Closed on ${text}` : `Closes on ${text}`;
    }
    text = text.toLowerCase();
    return closed ? `Closing date: ${text}` : `Closes ${text}`;
}

/**
 * The status tag's classes. SEP gives each status its own fill, text and
 * border rather than one neutral badge, so the colour has to travel with the
 * record. The styles are `sep-status-tag` in `site.css`; this only names them.
 * A state the lifecycle does not name falls back to the draft style.
 */
export function statusTagClass(status: string): string {
    const mod = JOB_STATUS_ORDER.includes(status) ? status.replace('_', '-') : 'draft';
    return `sep-status-tag sep-status-tag_${mod}`;
}
