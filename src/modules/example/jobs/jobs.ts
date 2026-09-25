import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

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
        return this.jobs.map((j) => {
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
        return !this.loading && !this.error && this.jobs.length > 0;
    }

    get isEmpty(): boolean {
        return !this.loading && !this.error && this.jobs.length === 0;
    }

    get itemCount(): string {
        const n = this.jobs.length;
        return n === 1 ? '1 item' : `${n} items`;
    }
}
