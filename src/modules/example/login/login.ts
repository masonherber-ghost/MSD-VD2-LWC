import { LightningElement } from 'lwc';
import { signIn, isSignedIn } from 'data/session';
import RealmeLoginModal from 'ui/realmeLoginModal';
import type { AuthUser } from 'data/api';

/**
 * Employer login.
 *
 * RealMe is the only way in, as it is in the R1.1 design: the page's whole job
 * is to hand off to the identity provider. The modal verifies against `ciam`
 * and resolves with the user; this page starts the session, which is the split
 * a real IDP handoff has.
 */
export default class Login extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    connectedCallback(): void {
        // Nothing to do here if a session already exists.
        if (isSignedIn()) {
            window.location.assign('/');
        }
    }

    async handleRealmeLogin(): Promise<void> {
        const user = (await RealmeLoginModal.open({
            size: 'small',
            // The accessible name for the dialog, not the visible header.
            label: 'Log in with RealMe'
        })) as AuthUser | null;

        // null means cancelled or dismissed — stay put, say nothing.
        if (user) {
            signIn(user);
            window.location.assign('/');
        }
    }
}
