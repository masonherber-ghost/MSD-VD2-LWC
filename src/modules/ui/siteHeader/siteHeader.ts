import { LightningElement, api } from 'lwc';
import {
    currentUser,
    displayName,
    onChange,
    signOut,
    type SessionUser
} from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';
import { enforceLoginGate } from 'data/gate';

const LINK = 'site-header__link';
const LINK_ACTIVE = 'site-header__link site-header__link_active';

/**
 * Lightning Experience style global header, shared by every route.
 *
 * Has an authenticated and an unauthenticated form: signed in, the main nav and
 * the profile menu show; signed out, only a Login link does. It re-renders on
 * session changes so signing in or out updates the header without a reload.
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

    connectedCallback(): void {
        this.user = currentUser();
        this.unsubscribe = onChange(() => {
            this.user = currentUser();
            enforceLoginGate(this.release);
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

    disconnectedCallback(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.unsubRelease?.();
        this.unsubRelease = null;
    }

    get isSignedIn(): boolean {
        return this.user !== null;
    }

    /** The bell has nothing behind it yet, so it only appears at 2+. */
    get showNotifications(): boolean {
        return isEnabled('siteHeader.notifications', this.release);
    }

    get userName(): string {
        return displayName(this.user);
    }

    get companyName(): string {
        return this.user?.company_name ?? '';
    }

    get loginClass(): string {
        return this.current === 'login' ? LINK_ACTIVE : LINK;
    }

    /**
     * The menu is navigation, not commands: lightning-button-menu has no href,
     * so the item's value carries the path and selection becomes a page load.
     * 'sign-out' is the one value that acts instead of navigating.
     */
    handleProfileSelect(event: CustomEvent): void {
        const value = (event.detail as { value?: string })?.value;
        if (value === 'sign-out') {
            signOut();
            window.location.assign('/');
            return;
        }
        this.navigate(event);
    }

    private navigate(event: CustomEvent): void {
        const path = (event.detail as { value?: string })?.value;
        if (path) {
            window.location.assign(path);
        }
    }
}
