import { LightningElement, api } from 'lwc';
import {
    currentUser,
    onChange,
    signOut,
    type SessionUser
} from 'data/session';
import {
    currentRelease,
    onChange as onReleaseChange,
    type Release
} from 'data/release';
import { enforceLoginGate, hasPublicSite } from 'data/gate';
// Aliased: `api` is already taken by the @api decorator imported from lwc.
import apiClient, { DEV_ACCOUNT_ID } from 'data/api';

/** A context-bar item, and the same item in the blueprint's selected state. */
const ITEM = 'slds-context-bar__item';
const ITEM_ACTIVE = 'slds-context-bar__item slds-is-active';
/** An item holding a button menu: centred, since the bar stretches its items. */
const MENU_ITEM = 'slds-context-bar__item slds-grid_vertical-align-center';
const MENU_ITEM_ACTIVE = `${MENU_ITEM} slds-is-active`;
/** The button menu inside such an item: square always, borderless unless selected. */
const NAV_MENU = 'site-header__nav-menu';
const NAV_MENU_UNSELECTED = 'site-header__nav-menu site-header__nav-menu_unselected';

/**
 * The site header: the SLDS 2 Global Navigation blueprint (`slds-context-bar`)
 * under the Cosmos theme, with no project CSS. Shared by every route.
 *
 * Signed in it carries the employer's workspace — My jobs, Employer profile
 * (My profile, My business details, Sign out) and Help centre. Signed out
 * from 1.2 it is the public front door — List your job, Recruiting with MSD,
 * Login. Signed out at 1.1 it shows the logo alone: that release had no
 * public site, and `data/gate` is already redirecting.
 *
 * Desktop and phone are the same destinations twice — context-bar items from
 * 768px, one `lightning-button-menu` below it — swapped by
 * `slds-show_medium` / `slds-hide_medium`. It re-renders on session and
 * release changes, so signing in or out needs no reload.
 */
export default class SiteHeader extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Marks the current page so the header can highlight it. */
    @api current = '';

    user: SessionUser | null = null;
    private unsubscribe: (() => void) | null = null;

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

    /**
     * Whether the account has any vacancy at all — a draft counts.
     *
     * The nav's first slot reads "Create a job" for an employer with nothing
     * listed yet and "My jobs" once there is something to go back to, so the
     * header has to know. It stays false until proven otherwise, so a failed or
     * absent API — the static build has no `/api` — leaves the nav as it was
     * rather than telling an employer with ten vacancies to create their first.
     */
    noVacancies = false;

    connectedCallback(): void {
        this.user = currentUser();
        void this.loadVacancyState();
        this.unsubscribe = onChange(() => {
            this.user = currentUser();
            enforceLoginGate(this.release);
            void this.loadVacancyState();
        });
        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
            enforceLoginGate(this.release);
        });
        // The header is the one component every route renders, which makes it
        // the only place a site-wide gate can run without touching all sixteen
        // of them. It re-runs on session and release changes, so toggling down
        // to 1.1 while signed out redirects immediately rather than on the next
        // navigation.
        enforceLoginGate(this.release);
    }

    /** Signed out there is no account to ask about, so nothing is fetched. */
    private async loadVacancyState(): Promise<void> {
        if (this.user === null) {
            return;
        }
        try {
            const jobs = await apiClient.jobs(this.user.account_id ?? DEV_ACCOUNT_ID);
            this.noVacancies = jobs.length === 0;
        } catch {
            // No /api in the static build. Leave the default — see the field.
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

    /** Signed out at 1.1 there is no public site, so no nav at all. */
    get showNav(): boolean {
        return this.isSignedIn || hasPublicSite(this.release);
    }

    /**
     * One slot, two labels: an employer with nothing listed is sent to create
     * their first vacancy; once anything exists — a draft counts — it becomes
     * the way back to the list.
     */
    get firstSlotLabel(): string {
        return this.noVacancies ? 'Create a job' : 'My jobs';
    }

    get firstSlotHref(): string {
        return this.noVacancies ? '/create-job/step2?start=new' : '/jobs';
    }

    get firstSlotClass(): string {
        const active = this.noVacancies ? this.current === 'create-job' : this.current === 'jobs';
        return active ? ITEM_ACTIVE : ITEM;
    }

    /** Employer profile covers both pages its menu leads to. */
    get profileClass(): string {
        return this.current === 'profile' || this.current === 'manage-org' ? MENU_ITEM_ACTIVE : MENU_ITEM;
    }

    get helpClass(): string {
        return this.current === 'help-centre' ? MENU_ITEM_ACTIVE : MENU_ITEM;
    }

    get profileMenuClass(): string {
        return this.current === 'profile' || this.current === 'manage-org' ? NAV_MENU : NAV_MENU_UNSELECTED;
    }

    get helpMenuClass(): string {
        return this.current === 'help-centre' ? NAV_MENU : NAV_MENU_UNSELECTED;
    }

    get listYourJobClass(): string {
        return this.current === 'create-job' ? ITEM_ACTIVE : ITEM;
    }

    get loginClass(): string {
        return this.current === 'login' ? ITEM_ACTIVE : ITEM;
    }

    /** The phone trigger: a hamburger, a cross while its menu is open. */
    mobileMenuOpen = false;

    get mobileMenuIcon(): string {
        return this.mobileMenuOpen ? 'utility:close' : 'utility:rows';
    }

    handleMobileOpen(): void {
        this.mobileMenuOpen = true;
    }

    handleMobileClose(): void {
        this.mobileMenuOpen = false;
    }

    /**
     * Menu items navigate through their own `href`; 'sign-out' is the one
     * value that acts instead.
     */
    handleMenuSelect(event: CustomEvent): void {
        if ((event.detail as { value?: string })?.value === 'sign-out') {
            signOut();
            window.location.assign('/');
        }
    }
}
