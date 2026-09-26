import { LightningElement } from 'lwc';
import api, { ApiError } from 'data/api';
import { currentUser, displayName, onChange, type SessionUser } from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

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

    /**
     * Held as a field, not read straight from the module, because only a field
     * change tells LWC to re-render — and every getter re-runs when it does.
     */
    release: Release = currentRelease();

    private unsubscribe: (() => void) | null = null;
    private unsubRelease: (() => void) | null = null;

    async connectedCallback(): Promise<void> {
        this.user = currentUser();
        this.unsubscribe = onChange(() => {
            this.user = currentUser();
        });
        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
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
        this.unsubRelease?.();
        this.unsubRelease = null;
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

    /**
     * Whether the account's vacancies are known.
     *
     * Everything below depends on this. With no /api — the static build — the
     * count is not zero, it is unknown, and the difference matters: an empty
     * state that fires on a failed load tells an employer with ten vacancies to
     * create their first.
     */
    get hasVacancies(): boolean {
        return this.loaded && this.jobCount > 0;
    }

    get hasNoVacancies(): boolean {
        return this.loaded && this.jobCount === 0;
    }

    /**
     * The Applicants and Next steps cards arrived after the first release. The
     * Vacancies card did not — it is the landing pad's whole point, so it is
     * ungated and shows from 1.1 up.
     */
    get hasSummary(): boolean {
        return this.loaded && isEnabled('home.dashboardStats', this.release);
    }

    /**
     * The Vacancies card shares a row with the other two once they arrive, and
     * would look stranded at a third width on its own before then.
     */
    get vacancyCardSize(): string {
        return this.hasSummary ? '4' : '6';
    }
}
