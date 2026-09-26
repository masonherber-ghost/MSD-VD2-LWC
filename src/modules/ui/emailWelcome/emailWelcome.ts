import { LightningElement } from 'lwc';

/**
 * Welcome email — sent once an account is active, whether the person
 * registered themselves or accepted an invitation. It orients them rather than
 * asking them to do anything, so the call to action is the portal itself.
 *
 * Sample values match the seeded account, as in ui/emailSecureInvite.
 */
export default class EmailWelcome extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';
}
