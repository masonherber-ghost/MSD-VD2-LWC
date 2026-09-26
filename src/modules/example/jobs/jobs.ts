import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

/**
 * The filter set above the list. `status` is matched against the `jobs.status`
 * column; `all` matches everything.
 *
 * The labels are the ones on the wireframe. Note they are not the vocabulary
 * the rest of the app uses — a card badge for the same record reads "Active",
 * not "Published".
 */
const FILTERS: { value: string; label: string; status?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Published', status: 'active' },
    { value: 'draft', label: 'Drafts', status: 'draft' },
    { value: 'in_review', label: 'Pending review', status: 'in_review' },
    { value: 'closed', label: 'Closed', status: 'closed' }
];

/**
 * Shown on a vacancy the employer has submitted and cannot yet edit.
 *
 * Deliberately says nothing about how long review takes — the design's copy
 * quotes 24 hours, and nothing in the data or the rules backs that up.
 */
const IN_REVIEW_NOTICE = 'This vacancy is with MSD for review.';

/** `creator_name` is already joined in by `job-repository.findByAccount`. */
function managedBy(name: unknown): string {
    const text = String(name ?? '').trim();
    return text ? `Managed by ${text}` : '';
}

const JOB_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In review',
    active: 'Active',
    closed: 'Closed'
};

interface MetaItem {
    key: string;
    icon: string;
    label: string;
    value: string;
}

interface JobCard {
    id: number;
    title: string;
    subtitle: string;
    href: string;
    statusLabel: string;
    isInReview: boolean;
    reviewNotice: string;
    meta: MetaItem[];
    applicants: string;
    newApplicants: string;
    hasNew: boolean;
}

/** The account's vacancies as a card grid — the object home for /jobs. */
export default class Jobs extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    jobs: Row[] = [];
    error = '';
    loading = true;

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

    /** The selected filter and the title search, owned here, not in the bar. */
    filter = 'all';
    search = '';

    async connectedCallback(): Promise<void> {
        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
        });
        try {
            this.jobs = await api.jobs(currentAccountId() ?? DEV_ACCOUNT_ID);
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

    // -- filtering ---------------------------------------------------------

    get filterOptions(): { label: string; value: string }[] {
        return FILTERS.map((f) => ({ label: f.label, value: f.value }));
    }

    /**
     * Filtering runs here rather than through the API. The account's vacancies
     * are already loaded, so matching in memory is instant and costs no request
     * per keystroke. `job-repository.findByAccount` does take `status` and
     * `contact_id` filters if this list ever grows past one page.
     */
    get filteredJobs(): Row[] {
        const selected = FILTERS.find((f) => f.value === this.filter);
        const term = this.search.trim().toLowerCase();

        return this.jobs.filter((j) => {
            if (selected?.status && String(j.status ?? '') !== selected.status) {
                return false;
            }
            if (term && !String(j.title ?? '').toLowerCase().includes(term)) {
                return false;
            }
            return true;
        });
    }

    handleFilterChange(event: CustomEvent): void {
        this.filter = (event.detail as { value?: string })?.value ?? 'all';
    }

    handleSearchChange(event: CustomEvent): void {
        this.search = (event.detail as { value?: string })?.value ?? '';
    }

    handleClearFilters(): void {
        this.filter = 'all';
        this.search = '';
    }

    /** Distinguishes "this account has no vacancies" from "none match". */
    get isFiltered(): boolean {
        return this.filter !== 'all' || this.search.trim() !== '';
    }

    get hasNoMatches(): boolean {
        return !this.loading && !this.error && this.jobs.length > 0 && this.filteredJobs.length === 0;
    }

    /** Applicant counts arrived with the applicant views, at 1.2. */
    get showApplicants(): boolean {
        return isEnabled('jobs.applicantCount', this.release);
    }

    get cards(): JobCard[] {
        return this.filteredJobs.map((j) => {
            const status = String(j.status ?? '');
            const count = Number(j.candidate_count ?? 0);
            const fresh = Number(j.new_candidate_count ?? 0);

            // Only rows the record actually holds. A missing value is left out
            // rather than shown as an em dash: on a wrapping row a placeholder
            // costs as much space as a real value and says less.
            const meta: MetaItem[] = [];
            const push = (key: string, icon: string, label: string, value: unknown) => {
                const text = String(value ?? '').trim();
                if (text) meta.push({ key, icon, label, value: text });
            };
            push('closes', 'utility:event', 'Closes', j.closing_date);
            // No label: the value already reads "Managed by <name>", and a
            // screen reader would otherwise hear it twice.
            push('owner', 'utility:user', '', managedBy(j.creator_name));
            push('location', 'utility:location', 'Location', j.location);
            push('pay', 'utility:moneybag', 'Pay', j.pay);
            push('contract', 'utility:contract', 'Contract', j.contract_type);

            return {
                id: Number(j.id),
                title: String(j.title ?? 'Untitled vacancy'),
                subtitle: String(j.subtitle ?? ''),
                href: `/jobs/job-detail?id=${j.id}`,
                statusLabel: JOB_STATUS_LABELS[status] ?? status,
                isInReview: status === 'in_review',
                reviewNotice: IN_REVIEW_NOTICE,
                meta,
                applicants: count === 1 ? '1 applicant' : `${count} applicants`,
                newApplicants: `${fresh} new`,
                hasNew: fresh > 0
            };
        });
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasJobs(): boolean {
        return !this.loading && !this.error && this.filteredJobs.length > 0;
    }

    get isEmpty(): boolean {
        return !this.loading && !this.error && this.jobs.length === 0;
    }

    /** Counts what is on screen, so it tracks the filter rather than the account. */
    get itemCount(): string {
        const n = this.filteredJobs.length;
        return n === 1 ? '1 item' : `${n} items`;
    }
}
