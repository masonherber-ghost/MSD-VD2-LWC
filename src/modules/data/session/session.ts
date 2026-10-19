/**
 * The signed-in user, for the prototype.
 *
 * Deliberately NOT a real session: the user record sits in localStorage and any
 * visitor could write one by hand. There is no token, nothing is verified on the
 * server, and every /api route stays open. It exists so the auth *flow* — sign
 * in, an authenticated shell, edit your profile, sign out — can be prototyped.
 *
 * Components subscribe with `onChange` so the header and page bodies re-render
 * together when someone signs in or out, including in another tab.
 */

const KEY = 'msd.session';
const EVENT = 'msd-session-change';

export interface SessionUser {
    contact_id: number;
    ciam_id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    phone: string | null;
    account_id: number | null;
    employer_role: string | null;
    company_name: string | null;
    /** True until the first-time welcome page has been seen. Absent on a
     *  session saved before the flag existed, which reads as not first-time. */
    first_time?: boolean;
}

/** Storage can throw (private mode, disabled cookies), so never let it break a render. */
function safeRead(): SessionUser | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
        return null;
    }
}

export function currentUser(): SessionUser | null {
    return safeRead();
}

export function isSignedIn(): boolean {
    return safeRead() !== null;
}

export function signIn(user: SessionUser): void {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(user));
    } catch {
        // A session that cannot persist still works for this page view.
    }
    broadcast();
}

export function signOut(): void {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        /* nothing to clear */
    }
    broadcast();
}

/**
 * Whether to send this person to the first-time welcome page. Read from the
 * session, which login and registration fill from `contacts.first_time`.
 */
export function needsWelcome(): boolean {
    return safeRead()?.first_time === true;
}

/** Record locally that the welcome page has been seen, without a re-login. */
export function markWelcomeSeen(): void {
    const user = safeRead();
    if (user?.first_time) {
        signIn({ ...user, first_time: false });
    }
}

/** The account whose data the app shows, or null when nobody is signed in. */
export function currentAccountId(): number | null {
    return safeRead()?.account_id ?? null;
}

export function displayName(user: SessionUser | null): string {
    if (!user) {
        return '';
    }
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return name || user.email;
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
