import { LightningElement, api } from 'lwc';

const ITEM = 'slds-tabs_default__item';
const ACTIVE = `${ITEM} slds-is-active`;

/**
 * The tab strip that links `/profile` and `/manage-org` to each other.
 *
 * Presentational and stateless: the page says which of the two it is, this
 * renders the strip. Both pages sit behind the same sign-in and are the two
 * halves of "your account", so moving between them should not mean going back
 * up to the header menu each time.
 *
 * It is navigation drawn as tabs, not a tabset — see the template for why that
 * distinction is load-bearing rather than pedantic.
 */
export default class AccountTabs extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Which page is showing: `profile` or `manage-org`. */
    @api current: 'profile' | 'manage-org' = 'profile';

    get isProfile(): boolean {
        return this.current !== 'manage-org';
    }

    get profileItemClass(): string {
        return this.isProfile ? ACTIVE : ITEM;
    }

    get orgItemClass(): string {
        return this.isProfile ? ITEM : ACTIVE;
    }

    /**
     * `aria-current="page"` on the link for the page you are on, and the
     * attribute absent on the other.
     *
     * Returning null rather than 'false' matters: LWC omits an attribute whose
     * value is null, whereas `aria-current="false"` is a value a screen reader
     * reads as a real state.
     */
    get profileCurrent(): string | null {
        return this.isProfile ? 'page' : null;
    }

    get orgCurrent(): string | null {
        return this.isProfile ? null : 'page';
    }
}
