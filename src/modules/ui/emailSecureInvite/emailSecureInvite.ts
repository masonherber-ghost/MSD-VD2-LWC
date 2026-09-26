import { LightningElement } from 'lwc';

/**
 * Secure invite email — sent when an account admin invites a colleague from
 * Manage org. It carries the single-use link that turns a `pending` contact
 * into a portal user.
 *
 * Sample values are the seeded account (see data/msd-vd2.db) rather than
 * invented ones, so the mockup reads against data that exists. The merge
 * fields a real template would carry are named in the comments beside them.
 */
export default class EmailSecureInvite extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';
}
