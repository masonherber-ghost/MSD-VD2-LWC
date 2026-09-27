import { LightningElement } from 'lwc';
import api, { ApiError, type Row } from 'data/api';
import { currentUser, type SessionUser } from 'data/session';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

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
 *
 * `workplace_address` is here but release-gated: it does not exist before
 * 1.2, so `toPayload` skips it whenever it is hidden. That matters because
 * `applyUpdate` only writes the keys it is handed — omitting it leaves the
 * column alone rather than nulling it, so previewing 1.1 and saving cannot
 * destroy an address entered in 1.2.
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

/**
 * Columns MSD holds the authoritative record for, so an employer may not edit
 * them once they hold a value — but may fill one in while it is still empty,
 * since a blank means nothing has been recorded yet.
 */
const LOCKED_WHEN_SET = [
    'company_name',
    'industry',
    'company_type',
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

    /** A field, so a release change re-renders and the getters re-run. */
    release: Release = currentRelease();
    private unsubRelease: (() => void) | null = null;

    async connectedCallback(): Promise<void> {
        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
        });
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

    disconnectedCallback(): void {
        this.unsubRelease?.();
        this.unsubRelease = null;
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

    /**
     * A cleared field goes back as null, not '', so the column reads as empty.
     * Locked fields are left out entirely rather than merely disabled in the
     * form, so a tampered DOM still cannot overwrite them.
     */
    private toPayload(): Row {
        const payload: Row = {};
        for (const f of TEXT_FIELDS) {
            // A hidden field is skipped for the same reason a locked one is: the
            // value is not the user's to set in this release, so it must not be
            // writable by a tampered DOM either.
            if (this.isLocked(f) || !this.isVisible(f)) {
                continue;
            }
            payload[f] = this.draft[f] === '' ? null : this.draft[f];
        }
        return payload;
    }

    /**
     * A field is locked when either rule says so:
     *
     * - before 1.2 the whole form was read-only, so nothing is editable; or
     * - it is a column MSD holds and the saved account already has a value.
     *
     * The saved account is consulted, never the draft, so typing into an empty
     * field does not lock it mid-edit.
     */
    private isLocked(field: string): boolean {
        if (!this.canEditDetails) {
            return true;
        }
        if (!LOCKED_WHEN_SET.includes(field as (typeof LOCKED_WHEN_SET)[number])) {
            return false;
        }
        const value = this.account?.[field];
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    /** Editing the org record arrived in 1.2. */
    get canEditDetails(): boolean {
        return isEnabled('manageOrg.editDetails', this.release);
    }

    /**
     * Lock state per field. A locked field renders as a read-only output
     * rather than a disabled input, which is how Lightning shows a value the
     * user cannot change, and keeps every locked field looking the same.
     */
    get lockCompanyName(): boolean {
        return this.isLocked('company_name');
    }

    get companyNameDisplay(): string {
        return this.displayOr(this.account?.company_name);
    }

    get lockIndustry(): boolean {
        return this.isLocked('industry');
    }

    get industryDisplay(): string {
        return this.displayOr(this.account?.industry);
    }

    get lockOrgType(): boolean {
        return this.isLocked('company_type');
    }

    /** The stored value is a slug, so show the option's label. */
    get orgTypeDisplay(): string {
        const value = String(this.account?.company_type ?? '');
        return COMPANY_TYPES.find((t) => t.value === value)?.label ?? this.displayOr(value);
    }

    get lockIrdNumber(): boolean {
        return this.isLocked('ird_number');
    }

    get irdNumberDisplay(): string {
        return this.displayOr(this.account?.ird_number);
    }

    get lockNzbn(): boolean {
        return this.isLocked('nzbn');
    }

    get lockTradingName(): boolean {
        return this.isLocked('trading_name');
    }

    get tradingNameDisplay(): string {
        return this.displayOr(this.account?.trading_name);
    }

    get lockWebAddress(): boolean {
        return this.isLocked('web_address');
    }

    get webAddressDisplay(): string {
        return this.displayOr(this.account?.web_address);
    }

    /**
     * Fields that do not exist in every release.
     *
     * Keyed by column so `toPayload` can ask the same question the template
     * does. A column absent from this map is always visible.
     */
    private isVisible(field: string): boolean {
        if (field === 'workplace_address') {
            return this.showWorkplaceAddress;
        }
        return true;
    }

    /**
     * Workplace address arrived at 1.2, so 1.1 does not show it at all.
     *
     * Reads `this.release` rather than calling `isEnabled()` bare: the field is
     * what makes this a render dependency, so the screen re-renders when the
     * toggle moves. See `rules-app-logic.md` § The reactivity rule.
     */
    get showWorkplaceAddress(): boolean {
        return isEnabled('manageOrg.workplaceAddress', this.release);
    }

    get lockWorkplaceAddress(): boolean {
        return this.isLocked('workplace_address');
    }

    get workplaceAddressDisplay(): string {
        return this.displayOr(this.account?.workplace_address);
    }

    get lockCompanyAddress(): boolean {
        return this.isLocked('company_address');
    }

    get companyAddressDisplay(): string {
        return this.displayOr(this.account?.company_address);
    }

    /**
     * The relationship manager MSD has assigned to this account.
     *
     * Not in TEXT_FIELDS and not in LOCKED_WHEN_SET, because it is not a form
     * field at all — it is always read-only, the way `verified` is. So there is
     * no draft entry, no lock getter and nothing in `toPayload`; and the server
     * leaves `relationship_manager` out of ACCOUNT_UPDATABLE, which is what
     * actually enforces it.
     */
    get relationshipManagerDisplay(): string {
        return this.displayOr(this.account?.relationship_manager);
    }

    /**
     * Whether to offer the contact link. An account with no relationship
     * manager recorded has nobody to email, so the link goes rather than
     * pointing at nothing.
     */
    get hasRelationshipManager(): boolean {
        const value = this.account?.relationship_manager;
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    /** An empty read-only field reads as a dash, not as blank space. */
    private displayOr(value: unknown): string {
        const text = value === null || value === undefined ? '' : String(value);
        return text.trim() ? text : '—';
    }

    get nzbnDisplay(): string {
        return this.displayOr(this.account?.nzbn);
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

            // A primary contact carries the account's authority, so they must
            // stay an Admin and cannot be removed. That leaves them no action,
            // and an empty menu reads as broken — so say why instead.
            const actions: { label: string; name: string; disabled?: boolean }[] = isPrimary
                ? [
                      {
                          label: 'Primary contact must stay an Admin',
                          name: 'locked',
                          disabled: true
                      }
                  ]
                : [
                      isAdmin
                          ? { label: 'Change to Member', name: 'make_member' }
                          : { label: 'Change to Admin', name: 'make_admin' },
                      { label: 'Make primary contact', name: 'make_primary' },
                      { label: 'Remove from team', name: 'remove' }
                  ];

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

    /** Team management arrived after the org details form. */
    get showTeamTab(): boolean {
        return isEnabled('manageOrg.team', this.release);
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

        if (action.name === 'locked') {
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
                // A primary contact must be an Admin, so a Member is promoted
                // on the way in rather than being left in a forbidden state.
                const promoted = row.employer_role !== 'admin';
                if (promoted) {
                    await api.changeMemberRole(accountId, Number(row.id), 'admin');
                }
                // The outgoing primary becomes secondary — see setAuthorisedContact.
                const outgoing = this.members.find((m) => m.is_primary_contact);
                await api.setAuthorisedContact(
                    accountId,
                    Number(row.id),
                    outgoing ? Number(outgoing.id) : null
                );
                this.teamMessage = promoted
                    ? `${row.name} is now the primary contact, and was made an Admin.`
                    : `${row.name} is now the primary contact.`;
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
