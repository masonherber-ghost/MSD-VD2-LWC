import { LightningElement } from 'lwc';
import api, { ApiError, type Row } from 'data/api';
import { currentUser, signIn, displayName, type SessionUser } from 'data/session';

/** The fields a person may change about themselves. Role and account are not among them. */
const EDITABLE = ['first_name', 'last_name', 'job_title', 'phone'] as const;
type EditableField = (typeof EDITABLE)[number];

/** My profile — the signed-in user's own contact record, editable. */
export default class Profile extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    user: SessionUser | null = null;
    contact: Row | null = null;
    draft: Record<EditableField, string> = {
        first_name: '',
        last_name: '',
        job_title: '',
        phone: ''
    };

    loading = true;
    saving = false;
    error = '';
    saved = false;

    async connectedCallback(): Promise<void> {
        this.user = currentUser();
        if (!this.user) {
            this.loading = false;
            return;
        }
        try {
            const contact = await api.contact(this.user.contact_id);
            this.contact = contact;
            this.draft = {
                first_name: String(contact.first_name ?? ''),
                last_name: String(contact.last_name ?? ''),
                job_title: String(contact.job_title ?? ''),
                phone: String(contact.phone ?? '')
            };
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load your profile.';
        } finally {
            this.loading = false;
        }
    }

    handleChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const field = input.dataset.field as EditableField;
        this.draft = { ...this.draft, [field]: input.value };
        this.saved = false;
    }

    async handleSave(): Promise<void> {
        if (!this.user) {
            return;
        }
        this.saving = true;
        this.error = '';
        try {
            const updated = await api.updateContact(this.user.contact_id, { ...this.draft });
            this.contact = updated;
            // The header shows this person's name, so the session has to follow.
            const refreshed: SessionUser = {
                ...this.user,
                first_name: String(updated.first_name ?? ''),
                last_name: String(updated.last_name ?? ''),
                job_title: String(updated.job_title ?? ''),
                phone: String(updated.phone ?? '')
            };
            signIn(refreshed);
            this.user = refreshed;
            this.saved = true;
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not save your profile.';
        } finally {
            this.saving = false;
        }
    }

    handleCancel(): void {
        const c = this.contact;
        if (!c) {
            return;
        }
        this.draft = {
            first_name: String(c.first_name ?? ''),
            last_name: String(c.last_name ?? ''),
            job_title: String(c.job_title ?? ''),
            phone: String(c.phone ?? '')
        };
        this.saved = false;
    }

    // -- state -------------------------------------------------------------

    get isSignedOut(): boolean {
        return !this.loading && this.user === null;
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get ready(): boolean {
        return !this.loading && this.user !== null && this.contact !== null && !this.error;
    }

    get fullName(): string {
        return displayName(this.user);
    }

    get email(): string {
        return this.user?.email ?? '';
    }

    get companyName(): string {
        return this.user?.company_name ?? '—';
    }

    /** admin / member, as stored on the contact. Not editable from here. */
    get roleLabel(): string {
        const role = String(this.contact?.employer_role ?? '');
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';
    }
}
