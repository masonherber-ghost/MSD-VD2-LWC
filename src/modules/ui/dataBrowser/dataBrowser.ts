import { LightningElement } from 'lwc';
import api, { ApiError } from 'data/api';
import type { DeleteResult, Row, TableSchema } from 'data/api';

const PAGE_SIZE = 25;

/**
 * Tables that get edited often enough to be worth a fixed spot at the top of
 * the rail. Everything else follows alphabetically.
 */
const PINNED = ['accounts', 'candidates', 'ciam', 'contacts', 'jobs'];

const humanize = (name: string): string =>
    name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/**
 * Schema-driven browser over every table in the database.
 *
 * Nothing here knows about jobs or candidates. The server publishes its
 * registry at /api/admin/schema and this builds the table list, the grid
 * columns, the forms and the delete rules from that — so adding a table or a
 * column to the screen means editing the registry, not this component.
 */
export default class DataBrowser extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    tables: TableSchema[] = [];
    selected = '';
    rows: Row[] = [];
    total = 0;
    offset = 0;
    search = '';
    sortedBy = '';
    sortDirection: 'asc' | 'desc' = 'asc';

    loading = true;
    error = '';
    notice = '';

    // Dialog state
    showForm = false;
    editingRow: Row | null = null;
    saving = false;
    formError = '';
    pendingDelete: Row | null = null;

    tableFilter = '';
    private searchTimer?: number;

    async connectedCallback(): Promise<void> {
        try {
            this.tables = await api.admin.schema();
            // Open whatever sits at the top of the rail, not whatever the
            // server happened to list first.
            const [first] = this.orderedTables;
            if (first) {
                await this.select(first.name);
            }
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not load the schema.';
        } finally {
            this.loading = false;
        }
    }

    disconnectedCallback(): void {
        clearTimeout(this.searchTimer);
    }

    // -- data ---------------------------------------------------------------

    async select(name: string): Promise<void> {
        this.selected = name;
        this.offset = 0;
        this.search = '';
        this.sortedBy = '';
        this.notice = '';
        await this.load();
    }

    async load(): Promise<void> {
        this.loading = true;
        this.error = '';
        try {
            const result = await api.admin.list(this.selected, {
                start: this.offset,
                limit: PAGE_SIZE,
                sort: this.sortedBy || undefined,
                order: this.sortDirection,
                q: this.search || undefined
            });
            this.rows = result.data;
            this.total = result.total;
        } catch (e) {
            this.rows = [];
            this.total = 0;
            this.error = e instanceof ApiError ? e.message : 'Could not load rows.';
        } finally {
            this.loading = false;
        }
    }

    // -- derived ------------------------------------------------------------

    get current(): TableSchema | undefined {
        return this.tables.find((t) => t.name === this.selected);
    }

    /** Pinned tables first in the order above, then the rest alphabetically. */
    get orderedTables(): TableSchema[] {
        const rank = (name: string): number => {
            const pinned = PINNED.indexOf(name);
            return pinned === -1 ? PINNED.length : pinned;
        };
        return [...this.tables].sort(
            (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name)
        );
    }

    get tableList() {
        const q = this.tableFilter.trim().toLowerCase();
        const matches = this.orderedTables.filter(
            (t) => !q || t.name.toLowerCase().includes(q)
        );
        // Rule off the pinned group, but only while it is actually at the top —
        // a filter that hides pinned tables should not leave a stray divider.
        const firstUnpinned = matches.findIndex((t) => !PINNED.includes(t.name));

        return matches.map((t, index) => {
            const classes = ['browser__item'];
            if (t.name === this.selected) classes.push('browser__item_active');
            if (index === firstUnpinned && index > 0) classes.push('browser__item_divided');
            return {
                name: t.name,
                label: t.label,
                rowCount: t.rowCount,
                className: classes.join(' ')
            };
        });
    }

    /** Datatable columns from the registry, plus row actions when allowed. */
    get columns() {
        const table = this.current;
        if (!table) return [];

        const columns: Record<string, unknown>[] = table.columns.map((c) => ({
            label: humanize(c),
            fieldName: c,
            sortable: true,
            wrapText: false,
            initialWidth: c === table.primaryKey ? 80 : undefined
        }));

        const actions = [
            ...(table.editable.length ? [{ label: 'Edit', name: 'edit' }] : []),
            ...(table.deletable ? [{ label: 'Delete', name: 'delete' }] : [])
        ];
        if (actions.length) {
            columns.push({ type: 'action', typeAttributes: { rowActions: actions } });
        }
        return columns;
    }

    get keyField(): string {
        return this.current?.primaryKey ?? 'id';
    }

    get canCreate(): boolean {
        return Boolean(this.current?.creatable);
    }

    get isReadOnly(): boolean {
        return Boolean(this.current) && !this.current!.editable.length;
    }

    get hasRows(): boolean {
        return !this.loading && !this.error && this.rows.length > 0;
    }

    get isEmpty(): boolean {
        return !this.loading && !this.error && this.rows.length === 0;
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasNotice(): boolean {
        return Boolean(this.notice);
    }

    get rangeLabel(): string {
        if (!this.total) return '0 rows';
        const from = this.offset + 1;
        const to = Math.min(this.offset + PAGE_SIZE, this.total);
        return `${from}–${to} of ${this.total}`;
    }

    get disablePrevious(): boolean {
        return this.offset === 0 || this.loading;
    }

    get disableNext(): boolean {
        return this.offset + PAGE_SIZE >= this.total || this.loading;
    }

    get confirmMessage(): string {
        const id = this.pendingDelete?.[this.keyField];
        return `Delete ${this.current?.label} #${id}?`;
    }

    get cascadeWarning(): string {
        return this.current?.cascades ?? '';
    }

    get hasCascadeWarning(): boolean {
        return Boolean(this.current?.cascades);
    }

    // -- events -------------------------------------------------------------

    handleSelectTable(event: Event): void {
        const name = (event.currentTarget as HTMLElement).dataset.name;
        if (name) this.select(name);
    }

    handleTableFilter(event: Event): void {
        this.tableFilter = (event.target as HTMLInputElement).value;
    }

    handleSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        clearTimeout(this.searchTimer);
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.searchTimer = setTimeout(() => {
            this.search = value;
            this.offset = 0;
            this.load();
        }, 300) as unknown as number;
    }

    handleSort(event: CustomEvent): void {
        this.sortedBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        this.offset = 0;
        this.load();
    }

    handlePrevious(): void {
        this.offset = Math.max(0, this.offset - PAGE_SIZE);
        this.load();
    }

    handleNext(): void {
        this.offset += PAGE_SIZE;
        this.load();
    }

    handleRowAction(event: CustomEvent): void {
        const { action, row } = event.detail;
        if (action.name === 'edit') {
            this.editingRow = row;
            this.formError = '';
            this.showForm = true;
        } else if (action.name === 'delete') {
            this.pendingDelete = row;
        }
    }

    handleNew(): void {
        this.editingRow = null;
        this.formError = '';
        this.showForm = true;
    }

    handleFormCancel(): void {
        this.showForm = false;
        this.editingRow = null;
    }

    async handleFormSave(event: CustomEvent): Promise<void> {
        const values = event.detail as Row;
        this.saving = true;
        this.formError = '';
        try {
            if (this.editingRow) {
                const id = Number(this.editingRow[this.keyField]);
                await api.admin.update(this.selected, id, values);
                this.notice = `Row ${id} updated.`;
            } else {
                const created = await api.admin.create(this.selected, values);
                this.notice = `Row ${created[this.keyField]} created.`;
            }
            this.showForm = false;
            this.editingRow = null;
            await this.refreshCounts();
            await this.load();
        } catch (e) {
            // Constraint failures come back as 400/409 with the SQLite message,
            // so they belong on the form rather than replacing the screen.
            this.formError = e instanceof ApiError ? e.message : 'Could not save.';
        } finally {
            this.saving = false;
        }
    }

    handleCancelDelete(): void {
        this.pendingDelete = null;
    }

    async handleConfirmDelete(): Promise<void> {
        const row = this.pendingDelete;
        if (!row) return;
        this.pendingDelete = null;
        try {
            const result: DeleteResult = await api.admin.remove(
                this.selected,
                Number(row[this.keyField])
            );
            const cascaded = Object.entries(result.cascaded);
            this.notice = cascaded.length
                ? `Deleted row ${result.deleted.id}. Cascaded: ${cascaded
                      .map(([t, n]) => `${t} (${n})`)
                      .join(', ')}.`
                : `Deleted row ${result.deleted.id}.`;
            await this.refreshCounts();
            await this.load();
        } catch (e) {
            this.error = e instanceof ApiError ? e.message : 'Could not delete the row.';
        }
    }

    /** Row counts in the rail go stale after any write. */
    async refreshCounts(): Promise<void> {
        try {
            this.tables = await api.admin.schema();
        } catch {
            // The counts are a convenience; a failure here must not lose the write.
        }
    }
}
