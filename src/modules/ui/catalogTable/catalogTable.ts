import { LightningElement } from 'lwc';
import COMPONENTS from 'data/catalog';

interface CatalogEntry {
    name: string;
    tag: string;
    module: string;
    minVersion: string | null;
    properties: string[];
    slots: string[];
}

export default class CatalogTable extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    all = COMPONENTS as CatalogEntry[];
    query = '';

    get rows() {
        const q = this.query.trim().toLowerCase();
        const matches = q
            ? this.all.filter(
                  (c) =>
                      c.tag.includes(q) ||
                      c.name.toLowerCase().includes(q) ||
                      c.properties.some((p) => p.toLowerCase().includes(q))
              )
            : this.all;

        return matches.map((c) => ({
            ...c,
            propertyList: c.properties.join(', ') || '—',
            slotList: c.slots.length ? c.slots.map((s) => s || 'default').join(', ') : '—'
        }));
    }

    get total(): number {
        return this.all.length;
    }

    get shown(): number {
        return this.rows.length;
    }

    handleSearch(event: CustomEvent): void {
        this.query = (event.target as HTMLInputElement).value;
    }
}
