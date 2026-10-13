import { LightningElement, api } from 'lwc';

type Option = { value: string; label: string; description?: string };

/**
 * A single-select group where each choice sits in its own `slds-box`, with a
 * description under the label.
 *
 * WHAT THIS IS, AND IS NOT. It is a COMPOSITION wrapper: shipped container
 * (`slds-box`) around shipped control (`lightning-input type="radio"`), with no
 * stylesheet and no markup that draws a control. `rules-lwc-layout.md` calls
 * that composition rather than a new custom control, so it does not need the
 * custom component gate.
 *
 * It replaced `ui/optionCards`, which was a different animal: that one
 * hand-wrote the `slds-visual-picker` blueprint plus 130 lines of CSS to
 * re-create selection states, which IS reproducing a control.
 *
 * Why not `lightning-radio-group`: its options are `{label, value}` and nothing
 * else — `transformedOptions` reads exactly those two keys — so a per-option
 * description cannot be passed through at all.
 *
 * `lightning-input` forwards `name` to the real inner `<input>`, so the boxes
 * still group as one selection.
 */
export default class RadioBoxGroup extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api options: Option[] = [];
    @api value = '';

    /** MUST be unique per group on a page, or the browser treats separate
     *  groups as one and selecting in either clears the other. */
    @api name = 'radio-box-group';

    /**
     * `stack` (the default) puts one box per row; `row` lays them side by side
     * from the medium breakpoint up. Both are SLDS grid utilities — this stays
     * a component with no stylesheet.
     */
    @api layout: 'stack' | 'row' = 'stack';

    @api legend = '';
    @api helpText = '';
    @api required = false;

    get isRow(): boolean {
        return this.layout === 'row';
    }

    get controlClass(): string {
        return this.isRow
            ? 'slds-form-element__control slds-grid slds-wrap slds-gutters_x-small'
            : 'slds-form-element__control';
    }

    get marked(): (Option & { checked: boolean; wrapperClass: string })[] {
        const wrapperClass = this.isRow
            ? 'slds-col slds-size_1-of-1 slds-medium-size_1-of-2 slds-m-bottom_small'
            : 'slds-m-bottom_small';
        return this.options.map((o) => ({
            ...o,
            checked: o.value === this.value,
            wrapperClass
        }));
    }

    /**
     * Re-dispatched as the group's own `change`, carrying the option value.
     *
     * The inner `lightning-input` change is stopped here. It bubbles out of this
     * light-DOM component, and its detail has no `value` — so a consumer reading
     * `detail.value` heard the right value from this event and then a blank one
     * from the inner event a moment later. That blanked the set-outcome form's
     * choice and left its Submit disabled; the create flow only escaped it
     * because its handler ignores events not targeted at the group itself.
     */
    handleChange(event: Event): void {
        event.stopPropagation();
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: { value: (event.target as HTMLInputElement).value }
            })
        );
    }
}
