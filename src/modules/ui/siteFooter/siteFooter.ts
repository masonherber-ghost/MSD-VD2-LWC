import { LightningElement } from 'lwc';
import {
    currentRelease,
    onChange,
    releaseOptions,
    setRelease,
    type Release
} from 'data/release';

/**
 * Docked footer carrying the release toggle.
 *
 * A prototyping control, not product chrome — it is how a reviewer switches
 * which release the site renders as. Sits on every route so the toggle is
 * always reachable.
 */
export default class SiteFooter extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    options = releaseOptions();
    release: Release = currentRelease();

    private unsubscribe: (() => void) | null = null;

    connectedCallback(): void {
        this.release = currentRelease();
        // Another tab, or another component, may change it.
        this.unsubscribe = onChange(() => {
            this.release = currentRelease();
        });
    }

    disconnectedCallback(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    handleReleaseChange(event: CustomEvent): void {
        const value = (event.detail as { value?: Release })?.value;
        if (value) {
            setRelease(value);
        }
    }
}
