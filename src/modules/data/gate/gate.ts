/**
 * The 1.1 login gate.
 *
 * Release 1.1 had no public site: signed out, every screen sent you to the
 * login form. From 1.2 there is a public front door, so the gate lifts. The
 * `site.public` flag is the switch — see `data/release`.
 *
 * THIS IS NOT ACCESS CONTROL. It reads the client session and redirects in the
 * browser; anyone can walk past it by editing localStorage, and every `/api`
 * route stays open regardless. It reproduces a *release's* flow so the two can
 * be compared, nothing more. See the notice at the top of `data/session`.
 */

import { currentRelease, isEnabled, type Release } from 'data/release';
import { currentUser } from 'data/session';

/**
 * Paths that must stay reachable even while the gate is down.
 *
 * `/login` and `/register` are the way in — gating them would lock the door
 * from the inside. `/design-system` and `/data` are the prototype's own tools
 * and have no signed-in meaning. The footer's release toggle rides on every one
 * of these, so there is always a way back up to 1.2.
 */
const EXEMPT = ['/login', '/register', '/design-system', '/data'];

function currentPath(): string {
    return window.location.pathname.replace(/\/+$/, '') || '/';
}

function isExempt(path: string): boolean {
    return EXEMPT.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Sends a signed-out visitor to the login screen when the selected release has
 * no public site. Safe to call repeatedly — it is a no-op everywhere else.
 */
export function enforceLoginGate(release: Release = currentRelease()): void {
    if (typeof window === 'undefined') {
        return;
    }
    if (isEnabled('site.public', release) || currentUser() !== null) {
        return;
    }
    if (isExempt(currentPath())) {
        return;
    }
    // `replace`, not `assign`: Back should not bounce off the gate forever.
    window.location.replace('/login');
}

/** Whether the public site exists in this release — what the public nav needs. */
export function hasPublicSite(release: Release = currentRelease()): boolean {
    return isEnabled('site.public', release);
}
