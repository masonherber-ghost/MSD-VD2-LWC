import { LightningElement } from 'lwc';
import api, { ApiError } from 'data/api';
import { signIn, isSignedIn } from 'data/session';

/** Sign-in form. Verifies against the ciam table and starts a prototype session. */
export default class Login extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    email = '';
    password = '';
    error = '';
    submitting = false;

    connectedCallback(): void {
        // Nothing to do here if a session already exists.
        if (isSignedIn()) {
            window.location.assign('/');
        }
    }

    handleEmail(event: Event): void {
        this.email = (event.target as HTMLInputElement).value;
    }

    handlePassword(event: Event): void {
        this.password = (event.target as HTMLInputElement).value;
    }

    /** Enter anywhere in the form submits, as a real sign-in page would. */
    handleKeyUp(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.handleSubmit();
        }
    }

    async handleSubmit(): Promise<void> {
        if (!this.email || !this.password) {
            this.error = 'Enter your email and password.';
            return;
        }
        this.submitting = true;
        this.error = '';
        try {
            const user = await api.auth.login(this.email, this.password);
            signIn(user);
            window.location.assign('/');
        } catch (e) {
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
