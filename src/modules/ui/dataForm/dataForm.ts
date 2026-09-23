import { LightningElement, api } from 'lwc';
import type { ColumnSpec, Row, TableSchema } from 'data/api';

interface Field {
    name: string;
    label: string;
    value: string;
    required: boolean;
    isSelect: boolean;
    isTextarea: boolean;
    isInput: boolean;
    options: { label: string; value: string }[];
    helpText: string;
}

const humanize = (name: string): string =>
    name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/**
 * Create/edit form for one row, generated from the table's column spec.
 *
 * There is no per-table form code: `editable` decides which fields exist,
 * `options` makes a field a dropdown, `long` makes it a textarea, `fk` marks it
 * numeric and `required` marks it required. A column the server will not accept
 * cannot be rendered here, and a new column appears as soon as the registry
 * declares it.
 */
export default class DataForm extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api schema!: TableSchema;
    @api row: Row | null = null;
    @api saving = false;
    @api error = '';

    draft: Record<string, string> = {};

    connectedCallback(): void {
        const source = this.row ?? {};
        this.draft = Object.fromEntries(
            (this.schema?.editable ?? []).map((c: ColumnSpec) => [
                c.name,
                source[c.name] === null || source[c.name] === undefined ? '' : String(source[c.name])
            ])
        );
    }

    get isEdit(): boolean {
        return Boolean(this.row);
    }

    get heading(): string {
        const id = this.row?.[this.schema.primaryKey];
        return this.isEdit ? `Edit ${this.schema.label} #${id}` : `New ${this.schema.label}`;
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get fields(): Field[] {
        return (this.schema?.editable ?? []).map((c: ColumnSpec) => {
            const isSelect = Boolean(c.options?.length);
            const isTextarea = Boolean(c.long) && !isSelect;
            return {
                name: c.name,
                label: humanize(c.name),
                value: this.draft[c.name] ?? '',
                required: this.schema.required.includes(c.name),
                isSelect,
                isTextarea,
                isInput: !isSelect && !isTextarea,
                options: [
                    { label: '—', value: '' },
                    ...(c.options ?? []).map((o) => ({ label: o, value: o }))
                ],
                helpText: c.fk ? 'Foreign key — the id of the related row.' : ''
            };
        });
    }

    handleChange(event: CustomEvent): void {
        const target = event.target as HTMLInputElement & { name: string };
        this.draft = { ...this.draft, [target.name]: String(target.value ?? '') };
    }

    handleCancel(): void {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleSave(): void {
        // Send only what the form holds; the server narrows it again to the
        // columns its registry says are writable.
        this.dispatchEvent(new CustomEvent('save', { detail: { ...this.draft } }));
    }
}
