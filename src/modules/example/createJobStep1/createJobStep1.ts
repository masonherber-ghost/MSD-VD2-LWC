import { LightningElement } from 'lwc';
import api, { ApiError, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import { COMPANY_TYPES, CONTACT_ROLES, labelFor } from 'data/reference';

const DEV_ACCOUNT_ID = 1;




const EM_DASH = '—';

/**
 * Step 1 of listing a job.
 *
 * Every field on this screen is MSD's record, pre-populated and read-only —
 * the employer confirms what is held rather than entering it. So there is no
 * draft and no payload: the page fetches, formats and renders static output,
 * the same way `example/manageOrg` renders a locked field.
 */
export default class CreateJobStep1 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';


    account: Row | null = null;
    primaryContact: Row | null = null;
    loading = true;
    error = '';

    roles = CONTACT_ROLES;

    /**
     * The optional vacancy contact — the only editable data on this screen.
     *
     * A whole object rather than four fields, reassigned on every keystroke:
     * LWC tracks the FIELD, so mutating a property in place would not re-render.
     */
    showVacancyContact = false;
    vacancyContact: Record<string, string> = {
        first_name: '',
        last_name: '',
        role: '',
        phone: '',
        email: ''
    };

    async connectedCallback(): Promise<void> {
        const accountId = currentAccountId() ?? DEV_ACCOUNT_ID;
        try {
            const [account, members] = await Promise.all([
                api.account(accountId),
                api.members(accountId)
            ]);
            this.account = account;
            // The company contact IS the account's primary contact. `members`
            // already carries the email from the joined ciam row, so this
            // avoids a third call to resolve it.
            this.primaryContact =
                (members ?? []).find((m) => m.is_primary_contact) ?? null;
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error =
                e instanceof ApiError ? e.message : 'Could not load your company details.';
        } finally {
            this.loading = false;
        }
    }

    get ready(): boolean {
        return !this.loading && !this.error && this.account !== null;
    }

    get hasError(): boolean {
        return !this.loading && this.error !== '';
    }


    // -- Company information ------------------------------------------------

    get companyTypeDisplay(): string {
        const slug = String(this.account?.company_type ?? '');
        return slug ? labelFor(COMPANY_TYPES, slug) : EM_DASH;
    }

    /**
     * "Construction > House Construction".
     *
     * Both halves come from the row — `industry` and `industry_detail`. The
     * detail column was added for this screen; with only the parent recorded
     * the separator is dropped rather than left dangling.
     */
    get industryDisplay(): string {
        const parent = String(this.account?.industry ?? '').trim();
        const detail = String(this.account?.industry_detail ?? '').trim();
        if (!parent) return EM_DASH;
        return detail ? `${parent} > ${detail}` : parent;
    }

    // -- Address ------------------------------------------------------------
    //
    // `accounts.company_address` is ONE text column and the design shows three
    // fields, so these split the stored string for display only. Nothing is
    // written back, and the split is positional: first comma-separated part is
    // the street, a trailing 4-digit group is the postcode, whatever sits
    // between is the district. A real form that CAPTURES an address needs three
    // real columns — see the handover.

    private get addressParts(): { street: string; district: string; postcode: string } {
        const raw = String(this.account?.company_address ?? '').trim();
        if (!raw) return { street: '', district: '', postcode: '' };

        const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
        const street = parts.shift() ?? '';

        let postcode = '';
        if (parts.length) {
            const last = parts[parts.length - 1];
            const match = last.match(/\b(\d{4})\b\s*$/);
            if (match) {
                postcode = match[1];
                // Keep the town that shares the final segment with the postcode
                // — dropping it would lose data the column holds.
                const town = last.slice(0, match.index).trim();
                if (town) parts[parts.length - 1] = town;
                else parts.pop();
            }
        }
        return { street, district: parts.join(', '), postcode };
    }

    get streetDisplay(): string {
        return this.or(this.addressParts.street);
    }

    get districtDisplay(): string {
        return this.or(this.addressParts.district);
    }

    get postcodeDisplay(): string {
        return this.or(this.addressParts.postcode);
    }

    // -- Company contact ----------------------------------------------------

    get firstNameDisplay(): string {
        return this.or(this.primaryContact?.first_name);
    }

    get lastNameDisplay(): string {
        return this.or(this.primaryContact?.last_name);
    }

    /** The design labels this "Role"; the contact record calls it job title. */
    get roleDisplay(): string {
        return this.or(this.primaryContact?.job_title);
    }

    get phoneDisplay(): string {
        return this.or(this.primaryContact?.phone);
    }

    get emailDisplay(): string {
        return this.or(this.primaryContact?.email);
    }

    /** MOCKUP state only — see the template. Verifies nothing. */
    captchaChecked = false;

    handleCaptchaChange(event: CustomEvent): void {
        this.captchaChecked = (event.target as HTMLInputElement).checked;
    }

    handleAddVacancyContact(): void {
        this.showVacancyContact = true;
    }

    /**
     * Removing clears what was typed as well as hiding the fields, so adding
     * again starts from empty rather than resurrecting a half-filled contact
     * the employer thought they had discarded.
     */
    handleRemoveVacancyContact(): void {
        this.showVacancyContact = false;
        this.vacancyContact = {
            first_name: '',
            last_name: '',
            role: '',
            phone: '',
            email: ''
        };
    }

    handleVacancyContactChange(event: CustomEvent): void {
        const field = (event.target as HTMLElement).dataset.field;
        if (!field) return;
        const value = (event.target as HTMLInputElement).value ?? '';
        this.vacancyContact = { ...this.vacancyContact, [field]: value };
    }

    /** An empty read-only value reads as a dash, not as blank space. */
    private or(value: unknown): string {
        const text = value === null || value === undefined ? '' : String(value);
        return text.trim() ? text : EM_DASH;
    }
}
