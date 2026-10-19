import { LightningElement } from 'lwc';
import api, { ApiError, type Row } from 'data/api';
import { currentUser, displayName, needsWelcome, onChange, type SessionUser } from 'data/session';
import { toListingCard, type ListingCard } from 'data/vacancyRules';

/**
 * Homepage, in two forms.
 *
 * Signed out it is the pitch, with the ways in. Signed in it is the employer's
 * landing pad — the homepage template (Figma 181:39504): a greeting with two
 * quick links, the jobs still in progress, and help centre topics.
 */

/** How many in-progress jobs the homepage lists before "View all jobs". */
const IN_PROGRESS_LIMIT = 3;

/**
 * Help centre topics. PLACEHOLDER COPY — transcribed from the design, which
 * itself labels them as placeholders ("Help topic 4 that runs over two
 * lines"). There are no help articles in the database or anywhere else in
 * the project yet, so every topic links to the help centre landing page.
 */
const HELP_TOPICS = [
    { key: 'topic-1', label: 'How do I make changes to a vacancy listing', href: '/help-centre' },
    { key: 'topic-2', label: 'How do I make changes to a vacancy listing', href: '/help-centre' },
    { key: 'topic-3', label: 'How do I make changes to a vacancy listing', href: '/help-centre' },
    { key: 'topic-4', label: 'Help topic 4 that runs over two lines', href: '/help-centre' },
    { key: 'topic-5', label: 'Help topic 5 that runs over two lines', href: '/help-centre' },
    { key: 'topic-6', label: 'Help topic 6 that runs over two lines', href: '/help-centre' }
];

export default class Home extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Static placeholder copy, so a constant. */
    helpTopics = HELP_TOPICS;

    user: SessionUser | null = null;
    jobs: Row[] = [];
    loaded = false;
    error = '';

    private unsubscribe: (() => void) | null = null;

    async connectedCallback(): Promise<void> {
        // A first-time visitor sees the welcome page before the dashboard,
        // however they arrived here. `replace`, so Back does not loop.
        if (needsWelcome()) {
            window.location.replace('/welcome');
            return;
        }

        this.user = currentUser();
        this.unsubscribe = onChange(() => {
            this.user = currentUser();
        });

        const accountId = this.user?.account_id;
        if (!accountId) {
            return;
        }
        try {
            this.jobs = await api.jobs(accountId);
            this.loaded = true;
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load your jobs.';
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

    /**
     * Jobs in progress: everything not closed — the design's hidden fourth
     * card is the closed one. The API returns newest first
     * (`job-repository.findByAccount`), so the first three are the latest.
     */
    get inProgressCards(): ListingCard[] {
        return this.jobs
            .filter((j) => j.status !== 'closed')
            .slice(0, IN_PROGRESS_LIMIT)
            .map(toListingCard);
    }

    get hasInProgress(): boolean {
        return this.loaded && this.inProgressCards.length > 0;
    }

    /**
     * Known to be empty, not unknown. With no /api the count is not zero, so
     * the empty state must not fire on a failed load — it would tell an
     * employer with ten vacancies to create their first.
     */
    get hasNoVacancies(): boolean {
        return this.loaded && this.jobs.length === 0;
    }

    /** Vacancies exist but every one is closed. */
    get hasOnlyClosed(): boolean {
        return this.loaded && this.jobs.length > 0 && this.inProgressCards.length === 0;
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }
}
