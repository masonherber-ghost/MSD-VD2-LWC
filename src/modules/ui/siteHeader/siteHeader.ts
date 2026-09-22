import { LightningElement, api } from 'lwc';

/** Lightning Experience style global header, shared by every route. */
export default class SiteHeader extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Marks the current page so the header can highlight it. */
    @api current = '';

    get designSystemClass(): string {
        return this.current === 'design-system'
            ? 'site-header__link site-header__link_active'
            : 'site-header__link';
    }

    get homeClass(): string {
        return this.current === 'home'
            ? 'site-header__link site-header__link_active'
            : 'site-header__link';
    }
}
