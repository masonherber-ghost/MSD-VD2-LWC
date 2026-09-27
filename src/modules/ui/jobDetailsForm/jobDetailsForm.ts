import { LightningElement, api } from 'lwc';

type Field = { key: string; label: string; value: string };
type Item = { key: string; text: string };

/**
 * The Details region of a vacancy record page.
 *
 * Presentational: `example/jobDetail` fetches and shapes the vacancy, this
 * renders it. Lifting it out of the page template is what lets the tabset
 * around it be release-gated — before 1.2 there is no applicants tab, so the
 * tab bar would be a single tab labelling itself, and this renders on its own
 * instead.
 *
 * It is also the extraction `rules-lwc-layout.md` § The modular component rule
 * names for this region, so `example/jobDetail` gets shorter by the same move.
 */
export default class JobDetailsForm extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Left-hand field column, already labelled and formatted by the page. */
    @api columnOne: Field[] = [];

    /** Right-hand field column. */
    @api columnTwo: Field[] = [];

    /** The vacancy's description, rendered through `lightning-formatted-text`. */
    @api description = '';

    @api responsibilities: Item[] = [];
    @api skills: Item[] = [];

    /**
     * Emptiness is decided here rather than passed in: it is a property of the
     * list, so the page has no reason to compute it. Both read a FIELD, so they
     * re-run when the page sets one.
     */
    get hasResponsibilities(): boolean {
        return this.responsibilities.length > 0;
    }

    get hasSkills(): boolean {
        return this.skills.length > 0;
    }
}
