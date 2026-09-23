import { LightningElement, api } from 'lwc';

const LINK = 'site-header__link';
const LINK_ACTIVE = 'site-header__link site-header__link_active';

/** Lightning Experience style global header, shared by every route. */
export default class SiteHeader extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Marks the current page so the header can highlight it. */
    @api current = '';

    get listAJobClass(): string {
        return this.current === 'list-a-job' ? LINK_ACTIVE : LINK;
    }

    get myJobsClass(): string {
        return this.current === 'my-jobs' ? LINK_ACTIVE : LINK;
    }

    get helpCentreClass(): string {
        return this.current === 'help-centre' ? LINK_ACTIVE : LINK;
    }

    /**
     * The menus are navigation, not commands: lightning-button-menu has no href,
     * so the item's value carries the path and selection becomes a page load.
     */
    handleAppSelect(event: CustomEvent): void {
        this.navigate(event);
    }

    handleProfileSelect(event: CustomEvent): void {
        this.navigate(event);
    }

    private navigate(event: CustomEvent): void {
        const path = (event.detail as { value?: string })?.value;
        if (path) {
            window.location.assign(path);
        }
    }
}
