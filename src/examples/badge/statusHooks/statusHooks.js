import { LightningElement } from 'lwc';

/**
 * Status colours through the component's PUBLIC hooks — the supported way to
 * colour a lightning-badge. `--slds-c-badge-color-background`,
 * `-color-border` and `-text-color` are read by the badge's own shadow
 * stylesheet, so they work in native shadow where a class on the host cannot
 * reach the inner pill (see the Theme classes example).
 *
 * Values are the theme's own status tokens (`--slds-g-color-*-container-1` and
 * `--slds-g-color-on-*-1`), so under Cosmos they are its pale tinted pairs.
 * Set inline here to keep the example self-contained; in the site a skin like
 * this belongs on a `sep-` class (rules-skinning.md).
 *
 * A PROJECT example, not one lightning-base-components ships. Collected by
 * `npm run catalog` from src/examples/ and labelled "(project)" on the
 * Components tab.
 */
export default class BadgeStatusHooks extends LightningElement {
    static renderMode = 'light';
}
