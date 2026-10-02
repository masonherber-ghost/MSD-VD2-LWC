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

/**
 * The status tag's modifier class. SEP gives each status its own fill, text and
 * border rather than one neutral badge, so the colour has to travel with the
 * record. The styles are in `ui/vacancyCard`; this only names them.
 */
function statusClass(status: string): string {
    const known = ['draft', 'in_review', 'active', 'closed'];
    const mod = known.includes(status) ? status.replace('_', '-') : 'draft';
    return `vacancy-card__status vacancy-card__status_${mod}`;
}

interface CardAction {
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
 * card the thing being thrown away is the employer's own listing, and
 * "Discard" says that without reading as a database operation.
 */
const EDIT: CardAction = { key: 'edit', label: 'Edit', icon: 'utility:edit' };
const SUBMIT: CardAction = { key: 'submit', label: 'Submit', icon: 'utility:upload' };
const DISCARD: CardAction = { key: 'discard', label: 'Discard', icon: 'utility:delete' };
const CLOSE: CardAction = { key: 'close', label: 'Close', icon: 'utility:close' };
const CLONE: CardAction = { key: 'clone', label: 'Clone', icon: 'utility:copy' };

/**
 * What an employer may do to a vacancy, by lifecycle state and release.
 *
 * `draft` -> `in_review` -> `active` -> `closed` (`rules-app-logic.md`
 * § Vacancy lifecycle).
 *
 * `in_review` has none on purpose: the vacancy is with MSD, the card already
 * says so, and withdrawing it is a transition neither the lifecycle nor the
 * data models. An empty set renders no buttons rather than disabled ones.
 *
 * Two are release-gated, so the set is a function of both and not a lookup.
 * `release` is passed in rather than read from the module — the caller holds it
 * in a field, which is what makes the toggle re-render the list. See
 * `rules-app-logic.md` § The reactivity rule.
 *
 * Still unwired, as `example/jobDetail`'s own header actions are — this decides
 * WHICH actions a state offers, not what they do.
 */
function actionsFor(status: string, release: Release): CardAction[] {
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
    statusClass: string;
    iconUrl: string;
    isInReview: boolean;
    reviewNotice: string;
    meta: MetaItem[];
    applicants: string;
    newApplicants: string;
    hasNew: boolean;
    actions: CardAction[];
    hasActions: boolean;
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

            const actions = actionsFor(status, this.release);

            return {
                id: Number(j.id),
                title: String(j.title ?? 'Untitled vacancy'),
                subtitle: String(j.subtitle ?? ''),
                href: `/jobs/job-detail?id=${j.id}`,
                statusLabel: JOB_STATUS_LABELS[status] ?? status,
                statusClass: statusClass(status),
                iconUrl: iconUrl(j.icon),
                isInReview: status === 'in_review',
                reviewNotice: IN_REVIEW_NOTICE,
                meta,
                applicants: count === 1 ? '1 applicant' : `${count} applicants`,
                newApplicants: `${fresh} new`,
                hasNew: fresh > 0,
                actions,
                hasActions: actions.length > 0
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
