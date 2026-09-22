import { LightningElement, api } from 'lwc';

/**
 * Frames a single component demo: a heading, an optional note, the live
 * example (slotted) and a toggleable markup snippet to copy from.
 *
 * Light DOM so the global SLDS stylesheet applies to the markup below.
 */
export default class DemoCard extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api label = '';
    @api note = '';
    @api code = '';

    showCode = false;

    get toggleLabel(): string {
        return this.showCode ? 'Hide markup' : 'Show markup';
    }

    get hasNote(): boolean {
        return Boolean(this.note);
    }

    handleToggleCode(): void {
        this.showCode = !this.showCode;
    }
}
