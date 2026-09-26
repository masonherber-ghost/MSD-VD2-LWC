import { api, LightningElement } from 'lwc';

/**
 * Mail-client chrome around one email: the From / To / Subject header a client
 * shows above the message, then the message itself on the canvas at the
 * standard 600px send width.
 *
 * It owns no content — the email goes in the default slot.
 */
export default class EmailPreview extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Sender, as the mail client would show it. */
    @api from = '';
    /** Recipient. */
    @api to = '';
    /** Subject line. */
    @api subject = '';
    /**
     * The preview text a client shows beside the subject in the inbox list.
     * Hidden inside the message itself on a real send; shown here because the
     * point of the screen is to review it.
     */
    @api preheader = '';
}
