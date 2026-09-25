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

const JOB_STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    in_review: 'In review',
    active: 'Active',
    closed: 'Closed'
};

interface JobCard {
    id: number;
    title: string;
    subtitle: string;
    href: string;
    statusLabel: string;
    location: string;
    pay: string;
    contractType: string;
    closingDate: string;
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

    /**
     * With the count gone the footer holds only the action, and spreading one
     * child pushes it left. Ending the row keeps the button where it was.
     */
    get cardFooterClass(): string {
        const align = this.showApplicants ? 'slds-grid_align-spread' : 'slds-grid_align-end';
        return `slds-grid ${align} slds-grid_vertical-align-center`;
    }

    get cards(): JobCard[] {
        return this.filteredJobs.map((j) => {
            const status = String(j.status ?? '');
            const count = Number(j.candidate_count ?? 0);
            const fresh = Number(j.new_candidate_count ?? 0);
            return {
                id: Number(j.id),
                title: String(j.title ?? 'Untitled vacancy'),
                subtitle: String(j.subtitle ?? ''),
                href: `/jobs/job-detail?id=${j.id}`,
                statusLabel: JOB_STATUS_LABELS[status] ?? status,
                location: String(j.location ?? '—'),
                pay: String(j.pay ?? '—'),
                contractType: String(j.contract_type ?? '—'),
                closingDate: String(j.closing_date ?? '—'),
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
