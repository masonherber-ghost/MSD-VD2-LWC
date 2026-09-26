import { api, LightningElement } from 'lwc';

/**
 * The master template every MSD transactional email is built inside: masthead,
 * body slot, footer.
 *
 * This is document markup, not a control — an email cannot be composed from
 * `lightning-*` components, because the artefact being mocked up is an HTML
 * email rendered by a mail client, not a Lightning page. The custom component
 * gate covers controls; this is the email equivalent of blueprint markup.
 *
 * Its stylesheet carries the typography for the whole email body, so the
 * individual templates only describe their own content.
 */
export default class EmailShell extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Sits under the masthead as the email's own title. */
    @api heading = '';
}
