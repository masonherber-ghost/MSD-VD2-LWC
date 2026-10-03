/**
 * Release preview — the site-wide feature flag.
 *
 * Lets a whole screen, or one widget inside it, be shown as it looks in a given
 * release, so variants can be compared without branching the code. The chosen
 * release persists like the session: it survives navigation, reloads and
 * sign-out, and changes propagate to every subscribed component (and to other
 * tabs) without a reload.
 *
 * It is kept out of `data/session` deliberately. The session is who you are and
 * is cleared on sign-out; the release is which build you are previewing and must
 * outlive it.
 *
 * Flags are CUMULATIVE. A feature registered at 1.2 is on for 1.2, 1.3, 1.4 and
 * 2+ — `isEnabled` asks "has this release reached the one the feature landed
 * in?", never "does it equal it". Two variants of the same widget are expressed
 * as two flags landing in different releases, not as an equality check.
 */

const KEY = 'msd.release';
const EVENT = 'msd-release-change';

/** Oldest first. Order is the comparison — see `atLeast`. */
export const RELEASES = ['1.1', '1.2', '1.3', '1.4', '2+'] as const;

export type Release = (typeof RELEASES)[number];

/**
 * The newest release, so the site shows its full current state by default and
 * stepping *back* is what reveals how it was built up.
 */
const DEFAULT_RELEASE: Release = '2+';

/**
 * Which release each feature lands in.
 *
 * PLACEHOLDER ASSIGNMENTS — the mechanism is real, the roadmap is not. Set
 * these to the actual releases. A feature absent from this map is treated as
 * always on, with a console warning, so a typo shows up loudly instead of
 * silently hiding a screen.
 */
const FEATURES: Record<string, Release> = {
    // Present since the first prototype release.
    'jobs.list': '1.1',
    'jobs.detail': '1.1',
    'auth.login': '1.1',
    'auth.register': '1.1',

    // Later additions, used to demonstrate the toggle.
    // Before 1.2 a profile was a read-only view of the contact record, and the
    // org record could be viewed but not edited.
    'profile.edit': '1.2',
    'manageOrg.editDetails': '1.2',
    'home.dashboardStats': '1.2',
    'jobDetail.activityTimeline': '1.2',
    'jobDetail.applicants': '1.2',
    // The tab bar on the vacancy record page. 1.1 has only a Details tab, and
    // a tab bar with one tab in it just labels the thing below it — so the
    // whole tabset goes and the details render on their own. It lands with the
    // applicants tab because that is what gives it a second tab to hold.
    'jobDetail.tabs': '1.2',
    'manageOrg.team': '1.2',
    // 1.1 collected one address for the organisation. The workplace address —
    // where the work actually happens, which can differ from the registered
    // company address — arrives with the editable org form at 1.2.
    'manageOrg.workplaceAddress': '1.2',
    'jobs.applicantCount': '1.2',
    // 1.1 had no public site at all: signed out, every route sent you to the
    // login screen. From 1.2 there is a public front door with its own nav, so
    // this one flag governs both the gate and the nav it replaced.
    'site.public': '1.2',
    'jobDetail.vacancyContact': '1.3',

    // The welcome email's "From here you can" list names tracking applicants
    // and managing the organisation — neither of which exists before 1.2
    // (jobDetail.applicants, manageOrg.*). At 1.1 it says the one true thing.
    'emails.welcomeFeatureList': '1.2',

    // Vacancy-card actions that are not available yet. Editing a LIVE vacancy
    // and cloning a closed one are both re-publish paths, which need the
    // review step to re-run — so they wait. A draft's Edit is unaffected:
    // nothing has been published, so there is nothing to re-review.
    'jobs.editActive': '2+',
    'jobs.cloneClosed': '2+',

    // Recording how a vacancy ended (filled, not filled, …) from the job
    // detail header. Part of the first release; a placeholder for now — the
    // action is listed, nothing behind it yet, and the data has no outcome
    // column to write to.
    'jobDetail.setOutcome': '1.1',

    // Not shipped yet — the bell is dressing until there is something behind it.
    'siteHeader.notifications': '2+'
};

function indexOf(release: Release): number {
    return RELEASES.indexOf(release);
}

/** Storage can throw (private mode, blocked cookies); never let it break a render. */
function safeRead(): Release {
    if (typeof window === 'undefined') {
        return DEFAULT_RELEASE;
    }
    try {
        const raw = window.localStorage.getItem(KEY) as Release | null;
        return raw && RELEASES.includes(raw) ? raw : DEFAULT_RELEASE;
    } catch {
        return DEFAULT_RELEASE;
    }
}

export function currentRelease(): Release {
    return safeRead();
}

export function setRelease(release: Release): void {
    if (!RELEASES.includes(release)) {
        return;
    }
    try {
        window.localStorage.setItem(KEY, release);
    } catch {
        // A release that cannot persist still applies to this page view.
    }
    broadcast();
}

/**
 * True when the selected release is `release` or newer.
 *
 * `selected` exists for LWC reactivity. A component holds the release in a
 * field and passes it in, so the field is genuinely read during render — LWC
 * re-renders only when a field it read last time changes, and a getter that
 * reached into this module instead would never mark that dependency.
 */
export function atLeast(release: Release, selected: Release = currentRelease()): boolean {
    return indexOf(selected) >= indexOf(release);
}

/** True when the selected release is exactly `release`. Prefer `atLeast`. */
export function isRelease(release: Release): boolean {
    return currentRelease() === release;
}

/** The release a feature lands in, or undefined when it is not registered. */
export function featureRelease(feature: string): Release | undefined {
    return FEATURES[feature];
}

/**
 * Whether a feature is on for the selected release.
 *
 * An unregistered feature is ON, with a warning — a typo should be obvious, not
 * silently blank out a screen.
 */
export function isEnabled(feature: string, selected: Release = currentRelease()): boolean {
    const landed = FEATURES[feature];
    if (!landed) {
        // eslint-disable-next-line no-console
        console.warn(`[release] unknown feature flag "${feature}" — treating as enabled.`);
        return true;
    }
    return atLeast(landed, selected);
}

/**
 * Options for the footer's segmented toggle, oldest first so left-to-right
 * reads as the release timeline.
 */
export function releaseOptions(): { label: string; value: Release }[] {
    return RELEASES.map((r) => ({ label: r, value: r }));
}

/** Every registered flag and its state, for a debug view. */
export function allFlags(
    selected: Release = currentRelease()
): { feature: string; landsIn: Release; enabled: boolean }[] {
    return Object.entries(FEATURES)
        .map(([feature, landsIn]) => ({ feature, landsIn, enabled: atLeast(landsIn, selected) }))
        .sort((a, b) => a.feature.localeCompare(b.feature));
}

/** Returns an unsubscribe function, for disconnectedCallback. */
export function onChange(handler: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }
    window.addEventListener(EVENT, handler);
    // `storage` only fires in *other* tabs, which is exactly the cross-tab case.
    window.addEventListener('storage', handler);
    return () => {
        window.removeEventListener(EVENT, handler);
        window.removeEventListener('storage', handler);
    };
}

function broadcast(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT));
    }
}
