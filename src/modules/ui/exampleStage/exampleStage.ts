import { LightningElement, api } from 'lwc';
import { loadExample } from 'data/exampleRegistry';

interface SourceFile {
    file: string;
    code: string;
}

let sourcesPromise: Promise<Record<string, SourceFile[]>> | undefined;

/** The 475KB of example source is only worth fetching once, and only on demand. */
function fetchSources(): Promise<Record<string, SourceFile[]>> {
    if (!sourcesPromise) {
        sourcesPromise = fetch('/public/assets/example-sources.json').then((r) => r.json());
    }
    return sourcesPromise;
}

/**
 * Renders one official example bundle from lightning-base-components, plus its
 * real source. Nothing about the example is re-authored here.
 */
export default class ExampleStage extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    ctor: unknown = undefined;
    error = '';
    loading = false;
    showSource = false;
    sources: SourceFile[] = [];
    activeFile = '';

    _exampleId = '';

    @api
    get exampleId(): string {
        return this._exampleId;
    }
    set exampleId(value: string) {
        this._exampleId = value;
        this.mount(value);
    }

    get toggleLabel(): string {
        return this.showSource ? 'Hide source' : 'Show source';
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get isEmpty(): boolean {
        return !this.ctor && !this.loading && !this.error;
    }

    get activeCode(): string {
        return this.sources.find((s) => s.file === this.activeFile)?.code || '';
    }

    get fileTabs() {
        return this.sources.map((s) => ({
            file: s.file,
            className:
                s.file === this.activeFile
                    ? 'stage__tab stage__tab_active'
                    : 'stage__tab'
        }));
    }

    async mount(id: string): Promise<void> {
        this.ctor = undefined;
        this.error = '';
        this.sources = [];
        if (!id) return;

        // The dev server compiles each example bundle on first request, which
        // can take a few seconds, so the wait is made visible.
        this.loading = true;

        try {
            const module = await loadExample(id);
            // A slow import for a since-abandoned selection must not overwrite the current one.
            if (this._exampleId !== id) return;
            this.ctor = module.default;
        } catch (e) {
            if (this._exampleId !== id) return;
            this.error = (e as Error).message;
        } finally {
            if (this._exampleId === id) {
                this.loading = false;
            }
        }

        try {
            const all = await fetchSources();
            if (this._exampleId !== id) return;
            this.sources = all[id] || [];
            this.activeFile =
                this.sources.find((s) => s.file.endsWith('.html'))?.file ||
                this.sources[0]?.file ||
                '';
        } catch {
            // Source display is a convenience; the live example still stands without it.
            this.sources = [];
        }
    }

    handleToggleSource(): void {
        this.showSource = !this.showSource;
    }

    handleSelectFile(event: Event): void {
        this.activeFile = (event.currentTarget as HTMLElement).dataset.file || '';
    }
}
