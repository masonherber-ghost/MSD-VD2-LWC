import { LightningElement } from 'lwc';
import Toast from 'lightning/toast';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { iconUrl } from 'data/jobIcons';
import { currentAccountId } from 'data/session';
import { startFromJob } from 'data/jobDraft';
import { setFlash, takeFlash } from 'data/flash';
import PublishJobModal from 'ui/publishJobModal';
import { REVIEWED_NOTICE, setOutcomeHref } from 'data/vacancyRules';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

/** The vacancy lifecycle, rendered as the Path chevron above the record body. */
const PATH_STEPS = [
    { value: 'draft', label: 'Draft' },
    { value: 'in_review', label: 'In review' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' }
];

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

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

    async connectedCallback(): Promise<void> {
        // A confirmation raised by the route that sent us here — the
        // set-outcome page's "closed" or "keep active" message. Shown once;
        // `takeFlash` clears as it reads. See `data/flash`.
        const flash = takeFlash();
        if (flash) {
            Toast.show(flash, this);
        }

        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
        });
        try {
            this.jobs = await api.jobs(currentAccountId() ?? DEV_ACCOUNT_ID);
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

    disconnectedCallback(): void {
        this.unsubRelease?.();
        this.unsubRelease = null;
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

    /**
     * Edit: seed the create flow from this vacancy, then open it at its first step (step 2).
     *
     * `this.job` is already the hydrated record — `api.job()` returns every
     * child collection — so there is nothing more to fetch. The id travels in
     * the URL as well as in the draft so step 2 can tell a real edit from a
     * stale draft left in this tab. See `data/jobDraft`.
     */
    /**
     * The header's other actions. Close job opens the set-outcome page, where
     * the employer says why; the rest are still unwired.
     */
    handleAction(event: CustomEvent): void {
        const value = (event.detail as { value?: string })?.value;
        if (value === 'close' && this.job) {
            window.location.assign(setOutcomeHref(this.job.id));
        } else if (value === 'publish') {
            void this.publish();
        }
    }

    /**
     * Publish job (a `reviewed` vacancy): confirm, then `POST /publish`, which
     * accepts MSD's changes and makes it live. The page reloads to show the new
     * state, carrying the toast across with `setFlash` — see `data/flash`.
     */
    private async publish(): Promise<void> {
        if (!this.job) return;
        const choice = await PublishJobModal.open({ label: 'Publish job listing', size: 'small' });
        if (choice !== 'publish') return;

        this.publishFailure = '';
        try {
            await api.publishJob(Number(this.job.id));
            setFlash({ label: `${String(this.job.title ?? 'Job')} was published`, variant: 'success' });
            window.location.assign(this.recordHref);
        } catch (e) {
            this.publishFailure = e instanceof ApiError ? e.message : 'Could not publish this job.';
        }
    }

    handleEdit(): void {
        if (!this.job) {
            return;
        }
        startFromJob(this.job);
        window.location.assign(`/create-job/step2?edit=${this.job.id}`);
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

    /**
     * The creator's name for the header. `api.job()` does not join it;
     * `api.jobs()` does, and that list is already loaded for this account.
     */
    /**
     * The notice under the Manage Job card. The design's copy, verbatim — the
     * 24 hours is placeholder product copy, not an SLA the data enforces (as
     * on the /jobs cards). Draft and published carry none.
     */
    get stateNotice(): string {
        switch (String(this.job?.status ?? '')) {
            case 'in_review':
                return 'This job is in review. Expect to hear from a staff member within 24hrs.';
            case 'reviewed':
                return REVIEWED_NOTICE;
            case 'closed':
                return 'This job listing is closed or has expired. To list a similar job, select List a job.';
            default:
                return '';
        }
    }

    /** Reviewed asks the employer to act, so its notice is a warning. */
    get stateNoticeVariant(): string {
        return String(this.job?.status ?? '') === 'reviewed' ? 'warning' : 'info';
    }

    get publishError(): string {
        return this.publishFailure;
    }

    publishFailure = '';

    get creatorName(): string {
        const row = this.jobs.find((j) => Number(j.id) === Number(this.job?.id));
        return String(row?.creator_name ?? '');
    }

    get candidateCount(): number {
        return this.candidates.length;
    }

    /**
     * The vacancy's category icon. '' when the job type has no artwork yet, in
     * which case the header keeps the shipped `standard:job_profile` icon —
     * the same fallback the list cards use.
     */
    get iconUrl(): string {
        return iconUrl(this.job?.icon);
    }

    get recordTitle(): string {
        return String(this.job?.title ?? '');
    }

    get recordHref(): string {
        return `/jobs/job-detail?id=${this.job?.id ?? ''}`;
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

    /**
     * The tab bar itself.
     *
     * Before 1.2 the Details tab is the only one, and a tabset holding a single
     * tab renders a bar whose only job is to name the panel under it. So the
     * whole tabset is gated, not its contents — gating the inside would leave
     * an empty scoped panel, which reads as a bug. `ui/jobListingPreview`
     * renders bare instead.
     *
     * The tab bar cannot be hidden with CSS: it lives in `lightning-tabset`'s
     * shadow root, inside a further `lightning-tab-bar` shadow root, and
     * neither exposes a part. See `rules-lwc-components.md` § Known traps.
     */
    get showTabs(): boolean {
        return isEnabled('jobDetail.tabs', this.release);
    }

    /**
     * Applicants arrived after the first release: before 1.2 a vacancy was a
     * record you posted and read back, with no view of who had applied. This
     * gates every part of that — the header count, the View applicants action,
     * the Applicants tab and the pipeline card — so 1.1 shows no trace of them.
     */
    get showApplicants(): boolean {
        return isEnabled('jobDetail.applicants', this.release);
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

    /**
     * The activity timeline arrived after the first release. This gates the
     * whole card — `hasTimeline` still governs its empty state.
     */
    get showActivity(): boolean {
        return isEnabled('jobDetail.activityTimeline', this.release);
    }

    /**
     * With applicants, activity and the vacancy contact all gated, 1.1 has no
     * sidebar at all — so the main region takes the full width rather than the
     * page leaving a blank right-hand third.
     */
    get hasSidebar(): boolean {
        return this.showApplicants || this.showActivity || this.hasContact;
    }

    get mainColumnSize(): string {
        return this.hasSidebar ? '8' : '12';
    }

    get vacancyContact(): Row | null {
        return (this.job?.vacancy_contact as Row) ?? null;
    }

    get contactName(): string {
        const c = this.vacancyContact;
        return c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : '';
    }

    /** The vacancy contact card arrived after the timeline. */
    get hasContact(): boolean {
        return this.vacancyContact !== null && isEnabled('jobDetail.vacancyContact', this.release);
    }
}
