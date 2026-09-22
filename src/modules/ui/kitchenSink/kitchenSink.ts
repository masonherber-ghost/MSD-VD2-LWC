import { LightningElement } from 'lwc';
import COMPONENTS from 'data/catalog';

interface Example {
    id: string;
    name: string;
    label: string;
    module: string;
}

interface Component {
    name: string;
    tag: string;
    module: string;
    minVersion: string | null;
    properties: string[];
    slots: string[];
    examples: Example[];
}

const ALL = COMPONENTS as Component[];
const FIRST_WITH_EXAMPLES = ALL.find((c) => c.examples.length)?.name || ALL[0].name;

/**
 * Storybook-style browser over the examples that ship with
 * lightning-base-components: pick a component, pick an example, see it run.
 */
export default class KitchenSink extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    query = '';
    selectedComponent = FIRST_WITH_EXAMPLES;
    selectedExample = '';

    connectedCallback(): void {
        this.applyHash();
        window.addEventListener('hashchange', this.applyHash);
    }

    disconnectedCallback(): void {
        window.removeEventListener('hashchange', this.applyHash);
    }

    // Deep links look like #button/withIcon so a specific example can be shared.
    applyHash = (): void => {
        const hash = window.location.hash.replace(/^#/, '');
        if (!hash) {
            this.selectExample(this.selectedComponent);
            return;
        }
        const [componentName, exampleName] = hash.split('/');
        const component = ALL.find((c) => c.name === componentName);
        if (!component) return;
        this.selectedComponent = component.name;
        const example = component.examples.find((e) => e.name === exampleName);
        this.selectedExample = example ? example.id : component.examples[0]?.id || '';
    };

    selectExample(componentName: string): void {
        const component = ALL.find((c) => c.name === componentName);
        this.selectedExample = component?.examples[0]?.id || '';
    }

    get componentList() {
        const q = this.query.trim().toLowerCase();
        return ALL.filter(
            (c) => !q || c.tag.includes(q) || c.properties.some((p) => p.toLowerCase().includes(q))
        ).map((c) => ({
            name: c.name,
            tag: c.tag,
            count: c.examples.length || '',
            className:
                c.name === this.selectedComponent
                    ? 'sink__item sink__item_active'
                    : 'sink__item'
        }));
    }

    get current(): Component | undefined {
        return ALL.find((c) => c.name === this.selectedComponent);
    }

    get exampleTabs() {
        return (this.current?.examples || []).map((e) => ({
            ...e,
            className:
                e.id === this.selectedExample
                    ? 'sink__example sink__example_active'
                    : 'sink__example'
        }));
    }

    get hasExamples(): boolean {
        return Boolean(this.current?.examples.length);
    }

    get propertyList(): string {
        return this.current?.properties.join(', ') || '—';
    }

    get slotList(): string {
        const slots = this.current?.slots || [];
        return slots.length ? slots.map((s) => s || 'default').join(', ') : '—';
    }

    get apiVersion(): string {
        return this.current?.minVersion || '—';
    }

    get matchCount(): number {
        return this.componentList.length;
    }

    get totalCount(): number {
        return ALL.length;
    }

    handleSearch(event: Event): void {
        this.query = (event.target as HTMLInputElement).value;
    }

    handleSelectComponent(event: Event): void {
        const name = (event.currentTarget as HTMLElement).dataset.name || '';
        this.selectedComponent = name;
        this.selectExample(name);
        this.syncHash();
    }

    handleSelectExample(event: Event): void {
        this.selectedExample = (event.currentTarget as HTMLElement).dataset.id || '';
        this.syncHash();
    }

    syncHash(): void {
        if (this.selectedExample) {
            window.location.hash = this.selectedExample;
        }
    }
}
