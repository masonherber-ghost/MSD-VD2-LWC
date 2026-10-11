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
    IN_REVIEW_NOTICE,
    JOB_FILTERS,
    JOB_STATUS_LABELS,
    actionsFor,
    closingText,
    filterJobs,
    noActionsReason,
    statusThemeClass
} from 'data/vacancyRules';

/** `creator_name` is already joined in by `job-repository.findByAccount`. */
function managedBy(name: unknown): string {
    const text = String(name ?? '').trim();
    return text ? `Managed by ${text}` : '';
}

/** "Showing …" per filter value — `JOB_FILTERS`' values, in plain words. */
const SHOWING: Record<string, string> = {
    all: 'Showing all jobs',
    active: 'Showing published jobs',
    draft: 'Showing draft jobs',
    in_review: 'Showing jobs in review',
    closed: 'Showing closed jobs'
};

/** A media-object row; every row after the first takes the 4px gap. */
const META_ROW = 'slds-media slds-media_center slds-media_small';

interface MetaItem {
    key: string;
    icon: string;
    label: string;
    value: string;
    rowClass: string;
}

interface MenuItem {
    key: string;
    label: string;
    icon: string;
    disabled: boolean;
    /** Set on Preview only: the one action that goes somewhere today. */
    href?: string;
}

interface JobCard {
    id: number;
    title: string;
    href: string;
    statusLabel: string;
    /** An SLDS `slds-theme_*` class, or '' for the plain badge. */
    statusClass: string;
    isInReview: boolean;
    /** Closed reads struck through and weak, per the design. */
    isClosed: boolean;
    reviewNotice: string;
    meta: MetaItem[];
    applicants: string;
    newApplicants: string;
    hasNew: boolean;
    /** The row menu's items. Never empty — see `noActionsReason`. */
    actions: MenuItem[];
}

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

    get cards(): JobCard[] {
        return this.filteredJobs.map((j) => {
            const status = String(j.status ?? '');
            const count = Number(j.candidate_count ?? 0);
            const fresh = Number(j.new_candidate_count ?? 0);

            // Only rows the record actually holds, as on /jobs3.
            const meta: MetaItem[] = [];
            const push = (key: string, icon: string, label: string, value: unknown) => {
                const text = String(value ?? '').trim();
                if (!text) return;
                const rowClass = meta.length ? `${META_ROW} slds-m-top_xx-small` : META_ROW;
                meta.push({ key, icon, label, value: text, rowClass });
            };
            // Icons are the design's: dayview, profile_alt, company.
            push('closes', 'utility:dayview', '', closingText(status, j.closing_date));
            push('owner', 'utility:profile_alt', '', managedBy(j.creator_name));
            push('location', 'utility:company', 'Location', j.location);

            const href = `/jobs/job-detail?id=${j.id}`;

            const actions: MenuItem[] = actionsFor(status).map((a) => ({
                ...a,
                disabled: false,
                href: a.key === 'preview' ? href : undefined
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
                isInReview: status === 'in_review',
                isClosed: status === 'closed',
                reviewNotice: IN_REVIEW_NOTICE,
                meta,
                applicants: count === 1 ? '1 applicant' : `${count} applicants`,
                newApplicants: `${fresh} new`,
                hasNew: fresh > 0,
                actions
            };
        });
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
