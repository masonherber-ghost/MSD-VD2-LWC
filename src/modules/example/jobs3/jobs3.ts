import { LightningElement } from 'lwc';
import Toast from 'lightning/toast';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { takeFlash } from 'data/flash';
import { currentAccountId } from 'data/session';
import { iconUrl } from 'data/jobIcons';
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
    statusTagClass,
    noActionsReason
} from 'data/vacancyRules';

/** `creator_name` is already joined in by `job-repository.findByAccount`. */
function managedBy(name: unknown): string {
    const text = String(name ?? '').trim();
    return text ? `Managed by ${text}` : '';
}

interface MetaItem {
    key: string;
    icon: string;
    label: string;
    value: string;
}

interface MenuItem {
    key: string;
    label: string;
    icon: string;
    disabled: boolean;
}

interface JobCard {
    id: number;
    title: string;
    subtitle: string;
    href: string;
    statusLabel: string;
    statusClass: string;
    iconUrl: string;
    isInReview: boolean;
    reviewNotice: string;
    meta: MetaItem[];
    applicants: string;
    newApplicants: string;
    hasNew: boolean;
    /** The row menu's items. Never empty — see `noActionsReason`. */
    actions: MenuItem[];
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

        // Anything the previous route raised — today, the confirmation that a
        // vacancy was submitted from the last step of the create flow. Taken
        // BEFORE the await, so a slow API cannot delay the confirmation, and
        // taken at all only once: `takeFlash` clears as it reads.
        //
        // `lightning/toast` builds its own overlay container, so this needs no
        // markup and no host app. `ShowToastEvent` on its own would not work
        // here — see `rules-architecture.md` § Version pinning.
        const flash = takeFlash();
        if (flash) {
            Toast.show(
                {
                    label: flash.label,
                    message: flash.message,
                    variant: flash.variant ?? 'info',
                    mode: 'dismissible'
                },
                this
            );
        }

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

    /** In memory, by the rule `data/vacancyRules` shares with `/jobs2`. */
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
            // No label on the first two: each value already says what it is
            // ("Closes next month", "Managed by <name>"), and a screen reader
            // would otherwise hear it twice.
            push('closes', 'utility:event', '', closingText(status, j.closing_date));
            push('owner', 'utility:user', '', managedBy(j.creator_name));
            push('location', 'utility:location', 'Location', j.location);
            // Pay and contract type are deliberately not on the card. They are
            // still on the record page and in the /jobs2 table.

            const actions: MenuItem[] = actionsFor(status, this.release).map((a) => ({
                ...a,
                disabled: false
            }));
            if (!actions.length) {
                actions.push({ key: 'none', label: noActionsReason(status), icon: '', disabled: true });
            }

            return {
                id: Number(j.id),
                title: String(j.title ?? 'Untitled vacancy'),
                subtitle: String(j.subtitle ?? ''),
                href: `/jobs/job-detail?id=${j.id}`,
                statusLabel: JOB_STATUS_LABELS[status] ?? status,
                statusClass: statusTagClass(status),
                iconUrl: iconUrl(j.icon),
                isInReview: status === 'in_review',
                reviewNotice: IN_REVIEW_NOTICE,
                meta,
                applicants: count === 1 ? '1 applicant' : `${count} applicants`,
                newApplicants: `${fresh} new`,
                hasNew: fresh > 0,
                actions
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
