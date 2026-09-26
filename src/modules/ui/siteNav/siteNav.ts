import { LightningElement, api } from 'lwc';
import { hasPublicSite } from 'data/gate';
import { type Release } from 'data/release';

const LINK = 'site-nav__link';
const LINK_ACTIVE = 'site-nav__link site-nav__link_active';
const MENU = 'site-nav__menu';
const MENU_ACTIVE = 'site-nav__menu site-nav__menu_active';

/**
 * The global navigation, in its two forms.
 *
 * Signed in it is the employer's workspace — List a job, My jobs, Help centre
 * and its dropdown. Signed out from 1.2 it is the public front door — List your
 * job and Recruiting with MSD. Signed out at 1.1 it renders nothing: that
 * release had no public site, and `data/gate` is already redirecting.
 *
 * Each form is written twice, once as a menu for phones and once as an inline
 * row for desktop, swapped by `slds-hide_medium` / `slds-show_medium` at 768px.
 * Only one is ever in the layout.
 *
 * `release` arrives as a property rather than being read from the module, so
 * LWC records it as a render dependency and the toggle takes effect without a
 * reload — see `rules-app-logic.md` § The reactivity rule.
 */
export default class SiteNav extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api signedIn = false;
    @api current = '';
    @api release: Release = '2+';

    get isSignedIn(): boolean {
        return this.signedIn;
    }

    /** Signed out before 1.2 there is nothing to navigate to. */
    get showNav(): boolean {
        return this.signedIn || hasPublicSite(this.release);
    }

    get listAJobClass(): string {
        return this.current === 'list-a-job' ? LINK_ACTIVE : LINK;
    }

    get listYourJobClass(): string {
        return this.listAJobClass;
    }

    get myJobsClass(): string {
        return this.current === 'jobs' ? LINK_ACTIVE : LINK;
    }

    get helpCentreMenuClass(): string {
        return this.current === 'help-centre' ? MENU_ACTIVE : MENU;
    }

    get recruitingMenuClass(): string {
        return this.current === 'recruiting' ? MENU_ACTIVE : MENU;
    }
}
