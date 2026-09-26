import LightningModal from 'lightning/modal';
import api, { ApiError } from 'data/api';
import type { AuthUser } from 'data/api';

/**
 * Mock RealMe identity provider.
 *
 * RealMe is the real IDP MSD authenticates employers through. This stands in for
 * the redirect to realme.govt.nz: same shape (hand off, collect credentials,
 * come back with an identity), but the credentials are checked against our own
 * `ciam` table rather than RealMe's.
 *
 * NOTE: this is the one component in the project that is NOT light DOM.
 * `LightningModal` extends `LightningShadowBaseClass`, so the shipped modal
 * renders into a shadow root and setting `renderMode = 'light'` would break it.
 * That is safe here because the `lightning-*` components carry their own
 * stylesheets rather than relying on the global SLDS sheet — see
 * `modalBase.css` and `button.css`, which both import their own SLDS CSS.
 *
 * Resolves via `close()` with the signed-in user, or `null` if cancelled. The
 * caller starts the session — this component does not touch it, exactly as a
 * real IDP would hand back an assertion for the service to act on.
 */
export default class RealmeLoginModal extends LightningModal {
    username = '';
    password = '';
    error = '';
    submitting = false;

    handleUsername(event: Event): void {
        this.username = (event.target as HTMLInputElement).value;
    }

    handlePassword(event: Event): void {
        this.password = (event.target as HTMLInputElement).value;
    }

    /** Enter anywhere in the form submits, as the real RealMe form does. */
    handleKeyUp(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.handleContinue();
        }
    }

    /**
     * Create a login / Forgot username / Forgot password.
     *
     * On the real site each leaves for a RealMe-hosted page. There is nothing
     * behind them here, so they are inert rather than pointing somewhere wrong.
     */
    handleMockLink(event: Event): void {
        event.preventDefault();
    }

    handleCancel(): void {
        this.close(null);
    }

    async handleContinue(): Promise<void> {
        if (!this.username || !this.password) {
            this.error = 'Enter your username and password.';
            return;
        }
        this.submitting = true;
        this.error = '';
        try {
            const user: AuthUser = await api.auth.login(this.username, this.password);
            this.close(user);
        } catch (e) {
            // Deliberately vague, as auth-repository.login is — see rules-app-logic.
            this.error =
                e instanceof ApiError ? e.message : 'Could not sign in. Try again.';
        } finally {
            this.submitting = false;
        }
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }
}
