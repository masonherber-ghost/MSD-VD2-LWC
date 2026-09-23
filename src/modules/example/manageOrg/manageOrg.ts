import { LightningElement } from 'lwc';
import api, { ApiError, type Row } from 'data/api';
import { currentUser, type SessionUser } from 'data/session';

/** Free text in the data, so these are suggestions rather than a closed set. */
const COMPANY_TYPES = [
    { label: 'Registered company', value: 'registered_company' },
    { label: 'Sole trader', value: 'sole_trader' },
    { label: 'Partnership', value: 'partnership' },
    { label: 'Trust', value: 'trust' },
    { label: 'Other', value: 'other' }
];

/**
 * The account columns this form edits.
 *
 * Everything else on the row — the company profile, hiring preferences,
 * `gst_registered` and `verified` — is left alone rather than blanked:
 * `applyUpdate` only writes the keys it is handed, so a column absent from this
 * list keeps whatever it already holds. `verified` is shown in the page header
 * only, since an employer verifying themselves would defeat its purpose.
 */
const TEXT_FIELDS = [
    'company_name',
    'trading_name',
    'industry',
    'company_type',
    'web_address',
    'company_address',
    'workplace_address',
    'ird_number',
    'nzbn'
] as const;

type Draft = Record<string, string | null>;

/**
 * Manage org: the account record and the people on it.
 *
 * Two tabs, as Lightning would do it — Org details is a field form over the
 * accounts row, Manage team is a related list over its contacts.
 */
export default class ManageOrg extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    companyTypes = COMPANY_TYPES;

    /**
     * rowActions must be a function or an array — it is not resolved from the
     * row the way other typeAttributes are — so the per-row menu is served from
     * the `actions` each row already carries.
     */
    getRowActions = (row: Row, done: (actions: unknown[]) => void): void => {
        done((row.actions as unknown[]) ?? []);
    };

    get memberColumns(): unknown[] {
        return [
            { label: 'Name', fieldName: 'name', hideDefaultActions: true },
            { label: 'Email', fieldName: 'email', hideDefaultActions: true },
            { label: 'Job title', fieldName: 'job_title', hideDefaultActions: true },
            { label: 'Role', fieldName: 'roleLabel', initialWidth: 110, hideDefaultActions: true },
            {
                label: 'Status',
                fieldName: 'statusLabel',
                initialWidth: 160,
                hideDefaultActions: true
            },
            { type: 'action', typeAttributes: { rowActions: this.getRowActions } }
        ];
    }

    user: SessionUser | null = null;
    account: Row | null = null;
    members: Row[] = [];
    draft: Draft = {};

    loading = true;
    saving = false;
    error = '';
    saved = false;

    /** The member awaiting a confirmed removal, if any. */
    pendingRemoval: Row | null = null;
    teamMessage = '';

    async connectedCallback(): Promise<void> {
        this.user = currentUser();
        const accountId = this.user?.account_id;
        if (!accountId) {
            this.loading = false;
            return;
        }
        try {
            await this.load(accountId);
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load the organisation.';
        } finally {
            this.loading = false;
        }
    }

    private async load(accountId: number): Promise<void> {
        const [account, members] = await Promise.all([
            api.account(accountId),
            api.members(accountId)
        ]);
        this.account = account;
        this.members = members;
        this.draft = this.toDraft(account);
    }

    private toDraft(account: Row): Draft {
        const draft: Draft = {};
        for (const f of TEXT_FIELDS) {
            draft[f] = account[f] === null || account[f] === undefined ? '' : String(account[f]);
        }
        return draft;
    }

    // -- Org details -------------------------------------------------------

    handleFieldChange(event: CustomEvent): void {
        const el = event.target as HTMLInputElement & { dataset: { field: string } };
        const detail = event.detail as { value?: unknown };
        const value = detail?.value ?? el.value;
        this.draft = { ...this.draft, [el.dataset.field]: value as string };
        this.saved = false;
    }

    async handleSaveDetails(): Promise<void> {
        const accountId = this.user?.account_id;
        if (!accountId) {
            return;
        }
        this.saving = true;
        this.error = '';
        try {
            const updated = await api.updateAccount(accountId, this.toPayload());
            this.account = updated;
            this.draft = this.toDraft(updated);
            this.saved = true;
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not save the organisation.';
        } finally {
            this.saving = false;
        }
    }

    /** A cleared field goes back as null, not '', so the column reads as empty. */
    private toPayload(): Row {
        const payload: Row = {};
        for (const f of TEXT_FIELDS) {
            payload[f] = this.draft[f] === '' ? null : this.draft[f];
        }
        return payload;
    }

    handleCancelDetails(): void {
        if (this.account) {
            this.draft = this.toDraft(this.account);
        }
        this.saved = false;
        this.error = '';
    }

    // -- Manage team -------------------------------------------------------

    get memberRows(): Row[] {
        return this.members.map((m) => {
            const isPrimary = Boolean(m.is_primary_contact);
            const isAdmin = m.employer_role === 'admin';
            const isPending = m.invitation_status === 'pending';

            const actions: { label: string; name: string }[] = isAdmin
                ? [{ label: 'Change to Member', name: 'make_member' }]
                : [{ label: 'Change to Admin', name: 'make_admin' }];
            if (!isPrimary) {
                actions.push({ label: 'Make primary contact', name: 'make_primary' });
                actions.push({ label: 'Remove from team', name: 'remove' });
            }

            const status = isPending ? 'Invite pending' : 'Active';
            return {
                ...m,
                name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || String(m.email ?? ''),
                roleLabel: isAdmin ? 'Admin' : 'Member',
                statusLabel: isPrimary ? `${status} · Primary` : status,
                actions
            };
        });
    }

    get memberCount(): string {
        const n = this.members.length;
        return n === 1 ? '1 person' : `${n} people`;
    }

    get teamTabLabel(): string {
        return `Manage team (${this.members.length})`;
    }

    async handleRowAction(event: CustomEvent): Promise<void> {
        const { action, row } = event.detail as {
            action: { name: string };
            row: Row;
        };
        const accountId = this.user?.account_id;
        if (!accountId) {
            return;
        }

        if (action.name === 'remove') {
            // Destructive, so it takes a second, explicit confirmation.
            this.pendingRemoval = row;
            this.teamMessage = '';
            return;
        }

        try {
            if (action.name === 'make_admin' || action.name === 'make_member') {
                const role = action.name === 'make_admin' ? 'admin' : 'member';
                await api.changeMemberRole(accountId, Number(row.id), role);
                this.teamMessage = `${row.name} is now ${role === 'admin' ? 'an Admin' : 'a Member'}.`;
            } else if (action.name === 'make_primary') {
                // The outgoing primary becomes secondary — see setAuthorisedContact.
                const outgoing = this.members.find((m) => m.is_primary_contact);
                await api.setAuthorisedContact(
                    accountId,
                    Number(row.id),
                    outgoing ? Number(outgoing.id) : null
                );
                this.teamMessage = `${row.name} is now the primary contact.`;
            }
            this.members = await api.members(accountId);
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not update that member.';
        }
    }

    async handleConfirmRemove(): Promise<void> {
        const accountId = this.user?.account_id;
        const target = this.pendingRemoval;
        if (!accountId || !target) {
            return;
        }
        try {
            await api.removeMember(accountId, Number(target.id));
            this.members = await api.members(accountId);
            this.teamMessage = `${target.name} was removed from the team.`;
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not remove that member.';
        } finally {
            this.pendingRemoval = null;
        }
    }

    handleCancelRemove(): void {
        this.pendingRemoval = null;
    }

    get hasPendingRemoval(): boolean {
        return this.pendingRemoval !== null;
    }

    get removalPrompt(): string {
        return this.pendingRemoval
            ? `Remove ${this.pendingRemoval.name} from ${this.companyName}?`
            : '';
    }

    get hasTeamMessage(): boolean {
        return Boolean(this.teamMessage);
    }

    // -- state -------------------------------------------------------------

    get isSignedOut(): boolean {
        return !this.loading && this.user === null;
    }

    get ready(): boolean {
        return !this.loading && this.account !== null && !this.error;
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get companyName(): string {
        return String(this.account?.company_name ?? 'Your organisation');
    }

    get isVerified(): boolean {
        return Boolean(this.account?.verified);
    }

    get verifiedLabel(): string {
        return this.isVerified ? 'Verified' : 'Not verified';
    }
}
