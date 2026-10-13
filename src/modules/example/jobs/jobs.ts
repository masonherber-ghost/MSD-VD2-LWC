import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';
import {
    JOB_FILTERS,
    filterJobs,
    toListingCard,
    type ListingCard
} from 'data/vacancyRules';

/** "Showing …" per filter value — `JOB_FILTERS`' values, in plain words. */
const SHOWING: Record<string, string> = {
    all: 'Showing all jobs',
    active: 'Showing published jobs',
    draft: 'Showing draft jobs',
    in_review: 'Showing jobs in review',
    closed: 'Showing closed jobs'
};

/**
 * The account's vacancies as out-of-the-box `lightning-card`s — the object
 * home for /jobs.
 *
 * Same data, filters and lifecycle actions as `/jobs3`; the difference is the
 * card. `ui/vacancyListingCard` keeps the shipped card anatomy and carries no
 * stylesheet, so this page shows how close the stock component gets to the
 * design `ui/vacancyCard` was built to.
 */
export default class Jobs extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    jobs: Row[] = [];
    error = '';
    loading = true;

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

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
        return JOB_FILTERS.map((f) => ({ label: f.label, value: f.value }));
    }

    get filteredJobs(): Row[] {
        return filterJobs(this.jobs, this.filter, this.search);
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

    /** Applicant counts arrived with the applicant views, at 1.2. */
    get showApplicants(): boolean {
        return isEnabled('jobs.applicantCount', this.release);
    }

    get cards(): ListingCard[] {
        return this.filteredJobs.map(toListingCard);
    }

    // -- states ------------------------------------------------------------

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasJobs(): boolean {
        return !this.loading && !this.error && this.filteredJobs.length > 0;
    }

    get hasNoMatches(): boolean {
        return !this.loading && !this.error && this.jobs.length > 0 && this.filteredJobs.length === 0;
    }

    /** What the list is showing, worded per filter as the design has it. */
    get showingText(): string {
        return SHOWING[this.filter] ?? SHOWING.all;
    }

    /**
     * The API returns an account's vacancies newest first
     * (`job-repository.findByAccount`, `ORDER BY created_at DESC`), so "Latest"
     * states the order the data already has. There is no sort control yet.
     */
    get sortText(): string {
        return 'Sorted by \u2018Latest\u2019.';
    }
}
