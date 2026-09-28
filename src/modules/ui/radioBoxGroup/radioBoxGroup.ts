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

    @api legend = '';
    @api helpText = '';
    @api required = false;

    get marked(): (Option & { checked: boolean })[] {
        return this.options.map((o) => ({ ...o, checked: o.value === this.value }));
    }

    handleChange(event: Event): void {
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: { value: (event.target as HTMLInputElement).value }
            })
        );
    }
}
