import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';

/** The vacancy lifecycle, rendered as the Path chevron above the record body. */
const PATH_STEPS = [
    { value: 'draft', label: 'Draft' },
    { value: 'in_review', label: 'In review' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' }
];

const JOB_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In review',
    active: 'Active',
    closed: 'Closed'
};

/** Pipeline order, which is also the order the sidebar widget lists them in. */
const CANDIDATE_STATUSES = [
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview', label: 'Interview' },
    { value: 'offer', label: 'Offer' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'sourced', label: 'Sourced' }
];

const CANDIDATE_COLUMNS = [
    { label: 'Applicant', fieldName: 'name', hideDefaultActions: true },
    { label: 'Match', fieldName: 'matchLabel', initialWidth: 90, hideDefaultActions: true },
    { label: 'Status', fieldName: 'statusLabel', initialWidth: 120, hideDefaultActions: true },
    { label: 'Applied', fieldName: 'applied_on', initialWidth: 120, hideDefaultActions: true },
    { label: 'Location', fieldName: 'location', hideDefaultActions: true },
    { label: 'Source', fieldName: 'source', hideDefaultActions: true }
];

function titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Applicants are anonymised in the data: the rows carry initials and an email,
 * never a name. The email local part is the only human-readable form available,
 * so the table derives a display name from it rather than showing "ST".
 */
function displayName(candidate: Row): string {
    const email = String(candidate.email ?? '');
    const local = email.split('@')[0] ?? '';
    const name = local
        .split(/[._-]/)
        .filter(Boolean)
        .map(titleCase)
        .join(' ');
    return name || String(candidate.initials ?? 'Applicant');
}

/** Reads ?id= without assuming a browser, so static generation stays safe. */
function requestedId(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const raw = new URLSearchParams(window.location.search).get('id');
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * One vacancy as a Lightning record page: highlights panel, path, and a 2:1
 * split of a tabset over sidebar cards. The record reached is `?id=`, falling
 * back to the first vacancy on the account when that is missing or unknown.
 */
export default class JobDetail extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    pathSteps = PATH_STEPS;
    candidateColumns = CANDIDATE_COLUMNS;

    jobs: Row[] = [];
    job: Row | null = null;
    candidates: Row[] = [];
    counts: Record<string, number> = {};

    error = '';
    loading = true;

    async connectedCallback(): Promise<void> {
        try {
            this.jobs = await api.jobs(DEV_ACCOUNT_ID);
            if (this.jobs.length) {
                const wanted = requestedId();
                const known = this.jobs.some((j) => Number(j.id) === wanted);
                await this.loadJob(known && wanted ? wanted : Number(this.jobs[0].id));
            }
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load vacancies.';
        } finally {
            this.loading = false;
        }
    }

    private async loadJob(id: number): Promise<void> {
        const [job, candidates, counts] = await Promise.all([
            api.job(id),
            api.candidatesByJob(id),
            api.statusCounts(id)
        ]);
        this.job = job;
        this.candidates = candidates;
        this.counts = counts;
    }

    async handleRecordSwitch(event: CustomEvent): Promise<void> {
        const id = Number((event.detail as { value?: string })?.value);
        if (!id || id === Number(this.job?.id)) {
            return;
        }
        this.loading = true;
        try {
            await this.loadJob(id);
            // Keep the URL addressable so a switched-to record can be linked.
            window.history.pushState({}, '', `/jobs/job-detail?id=${id}`);
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not load that vacancy.';
        } finally {
            this.loading = false;
        }
    }

    // -- state ------------------------------------------------------------

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasJob(): boolean {
        return !this.loading && !this.error && this.job !== null;
    }

    get isEmpty(): boolean {
        return !this.loading && !this.error && this.job === null;
    }

    // -- highlights panel --------------------------------------------------

    get recordOptions(): { value: string; label: string; checked: boolean }[] {
        return this.jobs.map((j) => ({
            value: String(j.id),
            label: String(j.title ?? 'Untitled vacancy'),
            checked: Number(j.id) === Number(this.job?.id)
        }));
    }

    get statusLabel(): string {
        const status = String(this.job?.status ?? '');
        return JOB_STATUS_LABELS[status] ?? titleCase(status);
    }

    get candidateCount(): number {
        return this.candidates.length;
    }

    /** The switcher label is the record name, as it is on a Lightning record page. */
    get recordTitle(): string {
        return String(this.job?.title ?? '');
    }

    get recordHref(): string {
        return `/jobs/job-detail?id=${this.job?.id ?? ''}`;
    }

    // -- details tab -------------------------------------------------------

    get detailRows(): { key: string; label: string; value: string }[] {
        const job = this.job;
        if (!job) {
            return [];
        }
        const fields: [string, unknown][] = [
            ['Vacancy title', job.title],
            ['Level', job.subtitle],
            ['Company', job.company_name],
            ['Job type', job.job_type],
            ['Contract type', job.contract_type],
            ['Experience level', job.experience_level],
            ['Education required', job.education_required],
            ['Driver licence', job.driver_licence_label],
            ['Location', job.location],
            ['Pay', job.pay],
            ['Hours', job.hours_description],
            ['Start date', job.start_date],
            ['Posted', job.posted_date],
            ['Closes', job.closing_date],
            ['Positions available', job.positions_available],
            ['Shortlist limit', job.max_shortlist],
            ['Campaign length', job.campaign_length_weeks ? `${job.campaign_length_weeks} weeks` : ''],
            ['Job reference', job.external_job_id]
        ];
        return fields.map(([label, value]) => ({
            key: label,
            label,
            value: value === null || value === undefined || value === '' ? '—' : String(value)
        }));
    }

    /** The field form is two columns, so the rows are split down the middle. */
    get detailColumnOne(): { key: string; label: string; value: string }[] {
        const rows = this.detailRows;
        return rows.slice(0, Math.ceil(rows.length / 2));
    }

    get detailColumnTwo(): { key: string; label: string; value: string }[] {
        const rows = this.detailRows;
        return rows.slice(Math.ceil(rows.length / 2));
    }

    get responsibilities(): { key: string; text: string }[] {
        return ((this.job?.responsibilities as string[]) ?? []).map((text, i) => ({
            key: `r${i}`,
            text
        }));
    }

    get skills(): { key: string; text: string }[] {
        return ((this.job?.skills as string[]) ?? []).map((text, i) => ({ key: `s${i}`, text }));
    }

    get hasResponsibilities(): boolean {
        return this.responsibilities.length > 0;
    }

    get hasSkills(): boolean {
        return this.skills.length > 0;
    }

    // -- related tab -------------------------------------------------------

    get candidateRows(): Row[] {
        return this.candidates.map((c) => ({
            ...c,
            name: displayName(c),
            matchLabel: titleCase(String(c.match_level ?? '')),
            statusLabel: titleCase(String(c.status ?? '').replace(/_/g, ' '))
        }));
    }

    get hasCandidates(): boolean {
        return this.candidates.length > 0;
    }

    get relatedLabel(): string {
        return `Applicants (${this.candidateCount})`;
    }

    // -- sidebar -----------------------------------------------------------

    /** Only the statuses actually present, so the widget stays readable. */
    get pipeline(): { key: string; label: string; count: number }[] {
        return CANDIDATE_STATUSES.filter((s) => (this.counts[s.value] ?? 0) > 0).map((s) => ({
            key: s.value,
            label: s.label,
            count: this.counts[s.value] ?? 0
        }));
    }

    get hasPipeline(): boolean {
        return this.pipeline.length > 0;
    }

    get shortlistCount(): number {
        return this.counts.shortlisted ?? 0;
    }

    get shortlistLimit(): number {
        return Number(this.job?.max_shortlist ?? 0);
    }

    get shortlistProgress(): number {
        const limit = this.shortlistLimit;
        return limit ? Math.round((this.shortlistCount / limit) * 100) : 0;
    }

    get shortlistCaption(): string {
        return `${this.shortlistCount} of ${this.shortlistLimit} shortlist places used`;
    }

    /**
     * The activity timeline is built from the applications themselves — the
     * only dated events in the data. Nothing here is invented.
     */
    get timeline(): { key: string; title: string; meta: string; date: string }[] {
        return this.candidateRows
            .slice(0, 6)
            .map((c) => ({
                key: String(c.id),
                title: `Application received from ${c.name}`,
                meta: `${c.statusLabel} · ${c.source ?? 'Direct'}`,
                date: String(c.applied_on ?? '')
            }));
    }

    get hasTimeline(): boolean {
        return this.timeline.length > 0;
    }

    get vacancyContact(): Row | null {
        return (this.job?.vacancy_contact as Row) ?? null;
    }

    get contactName(): string {
        const c = this.vacancyContact;
        return c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : '';
    }

    get hasContact(): boolean {
        return this.vacancyContact !== null;
    }
}
