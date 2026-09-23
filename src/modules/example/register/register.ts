import { LightningElement } from 'lwc';
import api, { ApiError, type RegisterInput } from 'data/api';
import { signIn, isSignedIn } from 'data/session';

/**
 * Registration. Creates the login, the contact behind it, and — when a company
 * name is given — the account they become the primary contact for.
 */
export default class Register extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    form: RegisterInput = {
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        job_title: '',
        phone: '',
        company_name: ''
    };

    confirm = '';
    error = '';
    submitting = false;

    connectedCallback(): void {
        if (isSignedIn()) {
            window.location.assign('/');
        }
    }

    handleChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const field = input.dataset.field as keyof RegisterInput | 'confirm';
        if (field === 'confirm') {
            this.confirm = input.value;
            return;
        }
        this.form = { ...this.form, [field]: input.value };
    }

    async handleSubmit(): Promise<void> {
        const problem = this.validate();
        if (problem) {
            this.error = problem;
            return;
        }
        this.submitting = true;
        this.error = '';
        try {
            const user = await api.auth.register(this.form);
            signIn(user);
            window.location.assign('/');
        } catch (e) {
            this.error =
                e instanceof ApiError ? e.message : 'Could not create the account. Try again.';
        } finally {
            this.submitting = false;
        }
    }

    /** Client-side checks mirror the server's; the server is still the authority. */
    private validate(): string {
        if (!this.form.email?.includes('@')) {
            return 'Enter a valid email address.';
        }
        if ((this.form.password ?? '').length < 8) {
            return 'Password must be at least 8 characters.';
        }
        if (this.form.password !== this.confirm) {
            return 'The two passwords do not match.';
        }
        return '';
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }
}
