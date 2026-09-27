import { LightningElement } from 'lwc';
import {
    currentRelease,
    isEnabled,
    onChange as onReleaseChange,
    type Release
} from 'data/release';

/**
 * Welcome email — sent once an account is active, whether the person
 * registered themselves or accepted an invitation. It orients them rather than
 * asking them to do anything, so the call to action is the portal itself.
 *
 * Sample values match the seeded account, as in ui/emailSecureInvite.
 *
 * WHAT IT SAYS DEPENDS ON THE RELEASE. From 1.2 it lists what the portal can
 * do; at 1.1 that list would be a lie — tracking applicants and managing the
 * organisation do not exist yet (`jobDetail.applicants`, `manageOrg.*` are all
 * 1.2). So 1.1 says the one thing that is true then.
 *
 * The release is held in a FIELD and subscribed to, not read from the module in
 * the getter: LWC re-renders only when a field read during the last render
 * changes, and a getter reaching into a module records no dependency. Without
 * this the copy would only change after a reload. See rules-app-logic.md
 * § The reactivity rule.
 */
export default class EmailWelcome extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    release: Release = currentRelease();

    private unsubRelease: (() => void) | null = null;

    connectedCallback(): void {
        this.release = currentRelease();
        this.unsubRelease = onReleaseChange(() => {
            this.release = currentRelease();
        });
    }

    disconnectedCallback(): void {
        this.unsubRelease?.();
        this.unsubRelease = null;
    }

    /** Passing `this.release` is what makes the field a render dependency. */
    get showFeatureList(): boolean {
        return isEnabled('emails.welcomeFeatureList', this.release);
    }
}
