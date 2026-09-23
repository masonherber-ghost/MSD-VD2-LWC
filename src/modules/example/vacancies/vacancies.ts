import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID } from 'data/api';

const COLUMNS = [
    { label: 'Title', fieldName: 'title' },
    { label: 'Location', fieldName: 'location' },
    { label: 'Pay', fieldName: 'pay' },
    { label: 'Contract', fieldName: 'contract_type' },
    { label: 'Status', fieldName: 'status' },
    { label: 'Applicants', fieldName: 'candidate_count', type: 'number', cellAttributes: { alignment: 'left' } }
];

/** First data-backed screen: the account's vacancies, live from SQLite. */
export default class Vacancies extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    columns = COLUMNS;
    jobs: Record<string, unknown>[] = [];
    error = '';
    loading = true;

    async connectedCallback(): Promise<void> {
        try {
            this.jobs = await api.jobs(DEV_ACCOUNT_ID);
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load vacancies.';
        } finally {
            this.loading = false;
        }
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

    get count(): number {
        return this.jobs.length;
    }
}
