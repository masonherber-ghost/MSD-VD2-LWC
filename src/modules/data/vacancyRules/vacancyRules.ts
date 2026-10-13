/**
 * What a vacancy list needs to know about vacancies, independent of how it
 * draws them.
 *
 * Shared rather than duplicated: `example/jobs` and `example/jobs3` render the account's
 * vacancies as cards and `example/jobs2` as a datatable, and the two must agree on the
 * filters, the status labels and which actions a state offers. A rule that
 * exists twice is a rule that will eventually differ — the same reasoning as
 * `data/reference` and `data/jobIcons`.
 */

/**
 * The filter set above the list. `status` is matched against the `jobs.status`
 * column; `all` matches everything.
 *
 * The labels are the ones on the wireframe. `active` reads "Published" here
 * and in `JOB_STATUS_LABELS` alike, so a filter and a badge for the same
 * record agree.
 */
export const JOB_FILTERS: { value: string; label: string; status?: string; statuses?: string[] }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Published', status: 'active' },
    { value: 'draft', label: 'Drafts', status: 'draft' },
    // `reviewed` is still a vacancy in review — MSD's changes await the
    // employer — so it is found under the same filter.
    { value: 'in_review', label: 'In review', statuses: ['in_review', 'reviewed'] },
    { value: 'closed', label: 'Closed', status: 'closed' }
];

export const JOB_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In review',
    reviewed: 'Changes to review',
    active: 'Published',
    closed: 'Closed'
};

/** `draft` -> `in_review` -> `reviewed` -> `active` -> `closed`, for sorting by lifecycle. */
export const JOB_STATUS_ORDER = ['draft', 'in_review', 'reviewed', 'active', 'closed'];

/**
 * Shown on a vacancy MSD has reviewed and changed (`reviewed`): the employer
 * must look at the changes and publish. The design's copy (Figma 570:102296).
 */
export const REVIEWED_NOTICE = "We've made some changes to this job. Please review them before submitting.";

/**
 * Shown on a vacancy the employer has submitted and cannot yet edit.
 *
 * The 24-hour expectation is the design's copy (Figma 445:39915), kept at the
 * product owner's request. Nothing in the data or the rules enforces it — it
 * is placeholder product copy, not a measured SLA.
 */
export const IN_REVIEW_NOTICE =
    'This vacancy is with MSD for review. Expect to hear from staff within 24hrs.';

/**
 * The search matches the title or the job number (`external_job_id`, the
 * number the job detail page offers to copy as "Job ID").
 *
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
        const wanted = selected?.statuses ?? (selected?.status ? [selected.status] : null);
        if (wanted && !wanted.includes(String(j.status ?? ''))) {
            return false;
        }
        if (
            term &&
            !String(j.title ?? '').toLowerCase().includes(term) &&
            !String(j.external_job_id ?? '').toLowerCase().includes(term)
        ) {
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
 * The vacancy actions this app offers, named once. Labels and icons are the
 * vacancy card design's flyout menu (Figma 445:39792).
 *
 * A published vacancy ends through one action, Close job, which opens the
 * set-outcome page (`setOutcomeHref`) — the outcome is chosen there.
 */
const PREVIEW: VacancyAction = { key: 'preview', label: 'Preview job', icon: 'utility:preview' };
const EDIT: VacancyAction = { key: 'edit', label: 'Edit job', icon: 'utility:edit' };
const SUBMIT: VacancyAction = { key: 'submit', label: 'Submit for review', icon: 'utility:upload' };
const DISCARD: VacancyAction = { key: 'discard', label: 'Discard job', icon: 'utility:delete' };
const CLOSE: VacancyAction = { key: 'close', label: 'Close job', icon: 'utility:close' };

/**
 * What an employer may do to a vacancy, by lifecycle state — the design's
 * "constrained actions" per status (Figma 445:39818 annotation).
 *
 * `draft` -> `in_review` -> `active` -> `closed` (`rules-app-logic.md`
 * § Vacancy lifecycle). Every state can be previewed; `in_review` can ONLY be
 * previewed, because the vacancy is with MSD.
 *
 * Still unwired apart from Preview, as `example/jobDetail`'s own header
 * actions are — this decides WHICH actions a state offers, not what they do.
 */
export function actionsFor(status: string): VacancyAction[] {
    switch (status) {
        case 'draft':
            return [PREVIEW, EDIT, SUBMIT, DISCARD];
        case 'in_review':
            return [PREVIEW];
        // MSD's changes are accepted with Publish job on the record page, so
        // the card offers the way there.
        case 'reviewed':
            return [PREVIEW];
        case 'active':
            return [PREVIEW, CLOSE];
        case 'closed':
            return [PREVIEW, DISCARD];
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
 *
 * Returns the FULL class string for the SLDS badge blueprint
 * (`<span class="slds-badge …">`), so `slds-badge` is included. The blueprint
 * reads the same `--slds-c-badge-*` hooks the `sep-status-tag` skin sets.
 */
export function statusTagClass(status: string): string {
    const mod = JOB_STATUS_ORDER.includes(status) ? status.replace('_', '-') : 'draft';
    return `slds-badge sep-status-tag sep-status-tag_${mod}`;
}

/**
 * The status badge's full class string: the SLDS badge blueprint plus its
 * Cosmos status theme. Under Cosmos `slds-theme_*` is a pale tinted fill with
 * coloured text, matching the LDS2 Badge examples (Base / Informational /
 * Warning / Error / Success). Used wherever a vacancy's status is shown
 * unskinned: the /jobs card, the job detail header, the listing preview.
 * The design's pills are the SLDS badge themes (Figma "Badge - Informational",
 * "- Success", "- Warning", and the plain badge for Closed), so the class is
 * SLDS's own and no project CSS defines it.
 */
export function statusThemeClass(status: string): string {
    switch (status) {
        case 'draft':
            return 'slds-badge slds-theme_info';
        case 'in_review':
        case 'reviewed':
            return 'slds-badge slds-theme_warning';
        case 'active':
            return 'slds-badge slds-theme_success';
        default:
            return 'slds-badge';
    }
}

/** The set-outcome page for a vacancy — where Close job leads. */
export function setOutcomeHref(id: unknown): string {
    return `/jobs/set-outcome?id=${encodeURIComponent(String(id ?? ''))}`;
}

export interface JobMetaItem {
    key: string;
    icon: string;
    text: string;
}

/**
 * Who and when, by state — shared by the Manage Job header and the job
 * summary on the set-outcome page, so both say the same thing:
 *   draft      Managed by
 *   in review  Managed by · Close date
 *   published  Managed by · Published · Close date
 *   closed     Managed by · Closed
 *
 * Only lines the record holds. `posted_date` and `closing_date` are free text
 * ("Recently posted", "Next Month"), shown as the record words them.
 */
export function jobMetaItems(job: Record<string, unknown>, creatorName: string): JobMetaItem[] {
    const status = String(job.status ?? '');
    const posted = String(job.posted_date ?? '').trim();
    const closes = closingText(status, job.closing_date);

    const items: JobMetaItem[] = [];
    const push = (key: string, icon: string, text: string) => {
        if (text.trim()) items.push({ key, icon, text });
    };
    push('owner', 'utility:user', creatorName ? `Managed by ${creatorName}` : '');
    if (status === 'active') push('posted', 'utility:event', posted);
    if (status === 'in_review' || status === 'reviewed' || status === 'active' || status === 'closed') {
        push('closes', 'utility:event', closes);
    }
    return items;
}

/**
 * An icon for the status badge, or '' for none. Only `reviewed` carries one —
 * the design's warning triangle on "Changes to review", which asks the
 * employer to act. Drawn with the badge blueprint's `slds-badge__icon`.
 */
export function statusIcon(status: string): string {
    return status === 'reviewed' ? 'utility:warning' : '';
}

/** One icon + value line on a listing card. */
export interface ListingMetaItem {
    key: string;
    icon: string;
    label: string;
    value: string;
    rowClass: string;
}

/** One row-menu item on a listing card. */
export interface ListingMenuItem {
    key: string;
    label: string;
    icon: string;
    disabled: boolean;
    /** Set on Preview and Close only: the actions that go somewhere today. */
    href?: string;
}

/** The shape `ui/vacancyListingCard` renders. */
export interface ListingCard {
    id: number;
    title: string;
    href: string;
    statusLabel: string;
    /** An SLDS `slds-theme_*` class, or '' for the plain badge. */
    statusClass: string;
    /** The badge's icon, '' for none — see `statusIcon`. */
    statusIcon: string;
    isInReview: boolean;
    /** MSD has changed it and the employer must review — a warning notice. */
    isReviewed: boolean;
    reviewedNotice: string;
    /** Closed reads struck through and weak, per the design. */
    isClosed: boolean;
    reviewNotice: string;
    meta: ListingMetaItem[];
    applicants: string;
    newApplicants: string;
    hasNew: boolean;
    /** The row menu's items. Never empty — see `noActionsReason`. */
    actions: ListingMenuItem[];
}

/** A media-object row; every row after the first takes the 4px gap. */
const META_ROW = 'slds-media slds-media_center slds-media_small';

/**
 * One job row shaped for `ui/vacancyListingCard`. Shared by `/jobs` and the
 * homepage's Jobs in-progress list, so the two cards cannot drift apart.
 * Only meta lines the record actually holds are included.
 */
export function toListingCard(j: Record<string, unknown>): ListingCard {
    const status = String(j.status ?? '');
    const count = Number(j.candidate_count ?? 0);
    const fresh = Number(j.new_candidate_count ?? 0);

    const meta: ListingMetaItem[] = [];
    const push = (key: string, icon: string, label: string, value: unknown) => {
        const text = String(value ?? '').trim();
        if (!text) return;
        const rowClass = meta.length ? `${META_ROW} slds-m-top_xx-small` : META_ROW;
        meta.push({ key, icon, label, value: text, rowClass });
    };
    // `creator_name` is already joined in by `job-repository.findByAccount`.
    const creator = String(j.creator_name ?? '').trim();
    // Icons are the design's: dayview, profile_alt, company.
    push('closes', 'utility:dayview', '', closingText(status, j.closing_date));
    push('owner', 'utility:profile_alt', '', creator ? `Managed by ${creator}` : '');
    push('location', 'utility:company', 'Location', j.location);

    const href = `/jobs/job-detail?id=${j.id}`;

    const actions: ListingMenuItem[] = actionsFor(status).map((a) => ({
        ...a,
        disabled: false,
        href: a.key === 'preview' ? href : a.key === 'close' ? setOutcomeHref(j.id) : undefined
    }));
    if (!actions.length) {
        actions.push({ key: 'none', label: noActionsReason(status), icon: '', disabled: true });
    }

    return {
        id: Number(j.id),
        title: String(j.title ?? 'Untitled vacancy'),
        href,
        statusLabel: JOB_STATUS_LABELS[status] ?? status,
        statusClass: statusThemeClass(status),
        statusIcon: statusIcon(status),
        isInReview: status === 'in_review',
        isReviewed: status === 'reviewed',
        reviewedNotice: REVIEWED_NOTICE,
        isClosed: status === 'closed',
        reviewNotice: IN_REVIEW_NOTICE,
        meta,
        applicants: count === 1 ? '1 applicant' : `${count} applicants`,
        newApplicants: `${fresh} new`,
        hasNew: fresh > 0,
        actions
    };
}
