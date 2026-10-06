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

    /**
     * True when the account has no vacancy at all, drafts included.
     *
     * Phrased as the negative because LWC requires a boolean `@api` to default
     * to `false` (LWC1099) — an absent attribute is false. False therefore has
     * to mean "assume there are vacancies", which is also the safe default: a
     * missing or failed `/api` leaves the nav as it was rather than telling an
     * employer with ten vacancies to create their first.
     */
    @api noVacancies = false;

    /**
     * Which half to render: `links` (the inline desktop row, the default) or
     * `menu` (the phone trigger). The header places one of each so both forms
     * keep reading from the same destination list.
     */
    @api region: 'links' | 'menu' = 'links';

    get isMenu(): boolean {
        return this.region === 'menu';
    }

    get isSignedIn(): boolean {
        return this.signedIn;
    }

    /** Signed out before 1.2 there is nothing to navigate to. */
    get showNav(): boolean {
        return this.signedIn || hasPublicSite(this.release);
    }

    /**
     * The second nav slot. An employer with nothing listed gets "Create a job",
     * pointing at the form; once anything exists — a draft counts — it becomes
     * "My jobs", pointing at the list. One slot, so the nav keeps its shape.
     */
    get firstSlotLabel(): string {
        return this.noVacancies ? 'Create a job' : 'My jobs';
    }

    get firstSlotHref(): string {
        return this.noVacancies ? '/create-job/step2?start=new' : '/jobs';
    }

    get firstSlotIcon(): string {
        return this.noVacancies ? 'utility:new' : 'utility:list';
    }

    get firstSlotClass(): string {
        const active = this.noVacancies
            ? this.current === 'create-job'
            : this.current === 'jobs';
        return active ? LINK_ACTIVE : LINK;
    }

    get contactUsClass(): string {
        return this.current === 'contact-us' ? LINK_ACTIVE : LINK;
    }

    get howItWorksMenuClass(): string {
        return this.current === 'how-it-works' ? MENU_ACTIVE : MENU;
    }

    get listYourJobClass(): string {
        return this.current === 'create-job' ? LINK_ACTIVE : LINK;
    }

    get recruitingMenuClass(): string {
        return this.current === 'recruiting' ? MENU_ACTIVE : MENU;
    }
}
