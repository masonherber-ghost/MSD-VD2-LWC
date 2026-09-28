/**
 * A one-shot message handed from the route that raises it to the route that
 * shows it.
 *
 * WHY THIS EXISTS. "Finish, go back to the list, and confirm it there" cannot
 * be done by showing a toast and then navigating: every route in this site is
 * its own document, so the navigation tears down the page the toast is
 * floating over before anyone reads it. The confirmation has to be raised
 * before leaving and shown after arriving.
 *
 * `sessionStorage`, not `localStorage`, and deliberately:
 *
 *   - it must not survive the browsing session, so a toast cannot resurface
 *     days later on a cold open;
 *   - it must not leak into another tab, which `localStorage` would do —
 *     `data/session` uses that on purpose, for exactly the opposite reason;
 *   - `take` clears as it reads, so a refresh of the destination does not show
 *     the same confirmation twice.
 *
 * The shape is the one `Toast.show()` takes, so the reading route passes it
 * straight through without a second vocabulary in between.
 */

const KEY = 'msd.flash';

export interface FlashMessage {
    /** Required by `lightning-toast` — its only required property. */
    label: string;
    message?: string;
    /** `info` | `success` | `warning` | `error`, as the toast defines them. */
    variant?: 'info' | 'success' | 'warning' | 'error';
}

/** Raise a message for the NEXT route to show. */
export function setFlash(flash: FlashMessage): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.setItem(KEY, JSON.stringify(flash));
    } catch {
        // Storage can throw (private mode, disabled cookies). A confirmation
        // that cannot be handed over is not worth failing the navigation for.
    }
}

/**
 * Read the pending message and clear it, so it is shown exactly once.
 *
 * Returns null when there is nothing pending, which is the usual case — every
 * call site must handle it, including during static generation where there is
 * no `window` at all.
 */
export function takeFlash(): FlashMessage | null {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.sessionStorage.getItem(KEY);
        if (!raw) {
            return null;
        }
        window.sessionStorage.removeItem(KEY);
        const parsed = JSON.parse(raw) as FlashMessage;
        // A hand-edited or half-written value must not break the page it lands
        // on; `label` is the one thing the toast cannot do without.
        return parsed && typeof parsed.label === 'string' ? parsed : null;
    } catch {
        return null;
    }
}
