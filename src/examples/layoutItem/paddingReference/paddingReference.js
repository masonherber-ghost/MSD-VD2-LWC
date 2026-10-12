import { LightningElement } from 'lwc';

/**
 * How `padding` on lightning-layout-item really behaves, read from the
 * component's own source (`lightning/layoutItem/styleUtils.js`): the six
 * accepted values, the SLDS classes each one puts on the item's host, what
 * happens to anything else, and the `pull-to-boundary` pairing.
 *
 * A PROJECT example, not one lightning-base-components ships. Collected by
 * `npm run catalog` from src/examples/ and labelled "(project)" on the
 * Components tab.
 */
export default class PaddingReference extends LightningElement {
    static renderMode = 'light';

    /** The component's PADDING list and PADDING_CLASS map, verbatim. */
    values = [
        { key: 'horizontal-small', classes: 'slds-p-left_small slds-p-right_small', space: '0.75rem left and right' },
        { key: 'horizontal-medium', classes: 'slds-p-left_medium slds-p-right_medium', space: '1rem left and right' },
        { key: 'horizontal-large', classes: 'slds-p-left_large slds-p-right_large', space: '1.5rem left and right' },
        { key: 'around-small', classes: 'slds-p-around_small', space: '0.75rem all sides' },
        { key: 'around-medium', classes: 'slds-p-around_medium', space: '1rem all sides' },
        { key: 'around-large', classes: 'slds-p-around_large', space: '1.5rem all sides' }
    ];
}
