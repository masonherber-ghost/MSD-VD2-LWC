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
    JOB_STATUS_LABELS,
    JOB_STATUS_ORDER,
    actionsFor,
    filterJobs,
    noActionsReason
} from 'data/vacancyRules';

type SortDirection = 'asc' | 'desc';

interface RowAction {
    label: string;
    name: string;
    iconName?: string;
    disabled?: boolean;
}

/**
 * What a column sorts BY, where that is not the value it shows.
 *
 * The title column's `fieldName` is the link, so sorting it as-is would order
 * by record id. Status sorts by lifecycle, not alphabetically — "Active" before
 * "Draft" says nothing about where a vacancy is.
 *
 * `closing_date` and `pay` are free text in the data ("Next Month",
 * "$24 – $27 per hour"), so neither can sort as a date or a number. Closing
 * date sorts as text; pay is not offered as sortable at all, since text order
 * would put $100 before $24.
 */
function sortValue(row: Row, field: string): string | number | null {
    if (field === 'href') return String(row.title ?? '').toLowerCase();
    if (field === 'statusLabel') {
        const i = JOB_STATUS_ORDER.indexOf(String(row.status ?? ''));
        return i === -1 ? JOB_STATUS_ORDER.length : i;
    }
    const v = row[field];
    if (v === null || v === undefined || v === '') return null;
    return typeof v === 'number' ? v : String(v).toLowerCase();
}

/**
 * The account's vacancies as a `lightning-datatable` — a second rendering of
 * `/jobs`, reachable by URL only.
 *
 * Same data (`api.jobs`), same filters and search (`ui/jobFilterBar`), same
 * lifecycle actions (`data/vacancyRules`), drawn as a list view. Sorting is
 * the datatable's own column-header control.
 *
 * Row actions are unwired, as the card buttons on `/jobs` and `example/jobDetail`'s
 * header actions are: this decides WHICH actions a state offers, not what
 * they do.
 */
export default class Jobs2 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    jobs: Row[] = [];
    error = '';
    loading = true;

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

    filter = 'all';
    search = '';

    sortedBy = 'statusLabel';
    sortedDirection: SortDirection = 'asc';

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

    // -- columns -----------------------------------------------------------

    /** Applicant counts arrived with the applicant views, at 1.2. */
    get showApplicants(): boolean {
        return isEnabled('jobs.applicantCount', this.release);
    }

    /** A getter, not a constant: the applicant columns are release-gated. */
    get columns(): Record<string, unknown>[] {
        const columns: Record<string, unknown>[] = [
            {
                label: 'Title',
                fieldName: 'href',
                type: 'url',
                sortable: true,
                typeAttributes: { label: { fieldName: 'title' } }
            },
            { label: 'Status', fieldName: 'statusLabel', sortable: true },
            { label: 'Closes', fieldName: 'closing_date', sortable: true },
            { label: 'Managed by', fieldName: 'creator_name', sortable: true },
            { label: 'Location', fieldName: 'location', sortable: true },
            { label: 'Pay', fieldName: 'pay' },
            { label: 'Contract', fieldName: 'contract_type', sortable: true }
        ];

        if (this.showApplicants) {
            columns.push(
                {
                    label: 'Applicants',
                    fieldName: 'candidate_count',
                    type: 'number',
                    sortable: true,
                    cellAttributes: { alignment: 'left' }
                },
                {
                    label: 'New',
                    fieldName: 'new_candidate_count',
                    type: 'number',
                    sortable: true,
                    cellAttributes: { alignment: 'left' }
                }
            );
        }

        // A function, not an array: each row's menu depends on its own status.
        columns.push({
            type: 'action',
            typeAttributes: {
                rowActions: (row: Row, done: (actions: RowAction[]) => void) =>
                    done(row.actions as RowAction[])
            }
        });

        return columns;
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

    // -- sorting -----------------------------------------------------------

    handleSort(event: CustomEvent): void {
        const { fieldName, sortDirection } = event.detail as {
            fieldName: string;
            sortDirection: SortDirection;
        };
        this.sortedBy = fieldName;
        this.sortedDirection = sortDirection;
    }

    // -- rows --------------------------------------------------------------

    get rows(): Row[] {
        const field = this.sortedBy;
        const dir = this.sortedDirection === 'desc' ? -1 : 1;

        const rows = this.filteredJobs.map((j) => {
            const status = String(j.status ?? '');
            const actions: RowAction[] = actionsFor(status).map((a) => ({
                label: a.label,
                name: a.key,
                iconName: a.icon
            }));

            return {
                ...j,
                title: String(j.title ?? 'Untitled vacancy'),
                href: `/jobs/job-detail?id=${j.id}`,
                statusLabel: JOB_STATUS_LABELS[status] ?? status,
                actions: actions.length
                    ? actions
                    : [{ label: noActionsReason(status), name: 'none', disabled: true }]
            };
        });

        // Empty values sort last in both directions — a blank is not "less".
        return rows.sort((a, b) => {
            const x = sortValue(a, field);
            const y = sortValue(b, field);
            if (x === y) return 0;
            if (x === null) return 1;
            if (y === null) return -1;
            return (x < y ? -1 : 1) * dir;
        });
    }

    // -- states ------------------------------------------------------------

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get isEmpty(): boolean {
        return !this.loading && !this.error && this.jobs.length === 0;
    }

    get hasNoMatches(): boolean {
        return !this.loading && !this.error && this.jobs.length > 0 && this.filteredJobs.length === 0;
    }

    /** Counts what is on screen, so it tracks the filter rather than the account. */
    get itemCount(): string {
        const n = this.filteredJobs.length;
        return n === 1 ? '1 item' : `${n} items`;
    }
}
