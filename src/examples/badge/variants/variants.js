import { LightningElement } from 'lwc';

/**
 * Every variant lightning-badge has. The component takes no `variant` property:
 * the two alternatives are SLDS classes on the host, which its own shadow
 * stylesheet reads (`:host(.slds-badge_inverse)`, `:host(.slds-badge_lightest)`).
 *
 * A PROJECT example, not one lightning-base-components ships. Collected by
 * `npm run catalog` from src/examples/ and labelled "(project)" on the
 * Components tab.
 */
export default class BadgeVariants extends LightningElement {
    static renderMode = 'light';
}
