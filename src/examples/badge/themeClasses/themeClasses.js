import { LightningElement } from 'lwc';

/**
 * SLDS theme classes on lightning-badge: `slds-theme_success` and friends.
 *
 * Shown because the /jobs status pills use them, and because the result is not
 * what the class name promises. The classes colour the HOST (the global
 * `.slds-badge` rule), but lightning-badge also paints its own pill on the
 * inner `[part="badge"]` span inside its shadow root, which the class cannot
 * reach. With no project CSS standing that inner pill down, you see the inner
 * grey pill sitting on the coloured host. For a coloured badge use the hooks
 * (Status colours example).
 *
 * A PROJECT example, not one lightning-base-components ships. Collected by
 * `npm run catalog` from src/examples/ and labelled "(project)" on the
 * Components tab.
 */
export default class BadgeThemeClasses extends LightningElement {
    static renderMode = 'light';
}
