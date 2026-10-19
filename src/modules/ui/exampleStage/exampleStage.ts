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

let pageSheetsPromise: Promise<CSSStyleSheet[]> | undefined;

/**
 * The page's own stylesheets (SLDS, fonts, design tokens, site.css, utilities),
 * as constructed sheets — built once, shared by every example.
 *
 * WHY. The shipped examples are native shadow-DOM components, and the global
 * stylesheets cannot reach inside a shadow root. On a real org synthetic shadow
 * lets them through, so the examples' own utility classes work there
 * (`slds-m-left_x-small` is what spaces the buttons in button/basic) — here
 * they did nothing, and neither did our component skins in site.css. Adopting
 * the page's sheets into the example's root restores both.
 *
 * Custom properties need none of this: they inherit through the shadow
 * boundary, so the tokens already reached the examples.
 */
function pageSheets(): Promise<CSSStyleSheet[]> {
    if (!pageSheetsPromise) {
        const hrefs = Array.from(
            document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
        ).map((l) => l.href);
        pageSheetsPromise = Promise.all(
            hrefs.map(async (href) => {
                const sheet = new CSSStyleSheet();
                await sheet.replace(await (await fetch(href)).text());
                return sheet;
            })
        );
    }
    return pageSheetsPromise;
}

/**
 * Renders one official example bundle from lightning-base-components, plus its
 * real source. Nothing about the example is re-authored here — the page's
 * stylesheets are adopted into its shadow root so it renders as it would on a
 * page (see `pageSheets`).
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

    renderedCallback(): void {
        if (typeof document === 'undefined') return;
        const root = this.querySelector('.stage__canvas > :not(lightning-spinner)')?.shadowRoot;
        if (!root || (root as ShadowRoot & { _pageSheets?: boolean })._pageSheets) return;
        (root as ShadowRoot & { _pageSheets?: boolean })._pageSheets = true;
        pageSheets()
            .then((sheets) => {
                // Page sheets first, so the example's own styles still win.
                root.adoptedStyleSheets = [...sheets, ...root.adoptedStyleSheets];
            })
            .catch(() => {
                // Unstyled examples are a degraded view, not an error worth surfacing.
            });
    }

    handleToggleSource(): void {
        this.showSource = !this.showSource;
    }

    handleSelectFile(event: Event): void {
        this.activeFile = (event.currentTarget as HTMLElement).dataset.file || '';
    }
}
