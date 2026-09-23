import { LightningElement } from 'lwc';
import api, { ApiError } from 'data/api';
import { currentUser, displayName, onChange, type SessionUser } from 'data/session';

/**
 * Homepage, in two forms.
 *
 * Signed out it is the pitch, with the ways in. Signed in it is the employer's
 * landing pad: their vacancies at a glance and the actions they came to do.
 */
export default class Home extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    user: SessionUser | null = null;
    jobCount = 0;
    applicantCount = 0;
    activeCount = 0;
    loaded = false;
    private unsubscribe: (() => void) | null = null;

    async connectedCallback(): Promise<void> {
        this.user = currentUser();
        this.unsubscribe = onChange(() => {
            this.user = currentUser();
        });

        const accountId = this.user?.account_id;
        if (!accountId) {
            return;
        }
        try {
            const jobs = await api.jobs(accountId);
            this.jobCount = jobs.length;
            this.activeCount = jobs.filter((j) => j.status === 'active').length;
            this.applicantCount = jobs.reduce(
                (total, j) => total + Number(j.candidate_count ?? 0),
                0
            );
            this.loaded = true;
        } catch (e) {
            // The static build has no /api; the summary simply stays hidden.
            this.loaded = !(e instanceof ApiError);
        }
    }

    disconnectedCallback(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    get isSignedIn(): boolean {
        return this.user !== null;
    }

    get firstName(): string {
        return this.user?.first_name || displayName(this.user);
    }

    get companyName(): string {
        return this.user?.company_name ?? '';
    }

    get hasSummary(): boolean {
        return this.loaded;
    }
}
