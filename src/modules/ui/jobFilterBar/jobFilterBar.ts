import { LightningElement, api } from 'lwc';

export interface FilterOption {
    label: string;
    value: string;
}

interface FilterButton extends FilterOption {
    variant: 'brand' | 'neutral';
}

/**
 * The filter row above a vacancy list: one exclusive set of status filters and
 * a title search.
 *
 * Each filter is a `lightning-button-stateful` rather than a segment of a
 * `lightning-radio-group type="button"`. The radio group is one strip that will
 * not wrap, so a set this size breaks down at phone width; separate buttons
 * reflow. The stateful button is the shipped two-state button — it renders
 * `aria-pressed` and the SLDS selected styling itself, so nothing here
 * hand-rolls a control.
 *
 * Its three label properties all take the same text: the label of a filter
 * should not change under the pointer the way "Follow" / "Following" does.
 *
 * The bar owns no state. It renders what it is given and reports what was
 * chosen, so the page stays the single source of truth for the filtering.
 */
export default class JobFilterBar extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api options: FilterOption[] = [];
    @api value = '';
    @api searchTerm = '';
    @api searchPlaceholder = 'Search by title or job number';

    /*
     * Brand for the active filter, neutral for the rest — white on brand blue
     * against blue on white, which is the clearest difference two shipped
     * button variants can make.
     *
     * `lightning-button-stateful` was the first choice, for its `aria-pressed`.
     * It does not work here: it signals its state by *changing its label*
     * ("Follow" becomes "Following"), and its only styling difference for
     * `slds-is-selected` is `border-color: transparent`. Give it one label, as
     * a filter must have, and selected and unselected render identically.
     * Forcing `variant="brand"` on top was worse — the SLDS 2 selected rule
     * drops the fill while brand keeps white text, measured at 1:1 contrast.
     */
    get filterButtons(): FilterButton[] {
        return this.options.map((o) => ({
            ...o,
            variant: o.value === this.value ? 'brand' : 'neutral'
        }));
    }

    handleFilterClick(event: Event): void {
        const value = (event.currentTarget as HTMLElement).dataset.value ?? '';
        if (value && value !== this.value) {
            this.dispatchEvent(new CustomEvent('filterchange', { detail: { value } }));
        }
    }

    handleSearchChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value ?? '';
        this.dispatchEvent(new CustomEvent('searchchange', { detail: { value } }));
    }
}
