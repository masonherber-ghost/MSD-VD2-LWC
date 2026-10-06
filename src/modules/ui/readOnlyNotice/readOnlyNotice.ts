import { LightningElement, api } from 'lwc';

/**
 * Explains that some of the details on a screen are MSD's record, and says how
 * to get them changed.
 *
 * Shared by `/manage-org` and `/profile`, which both show a mix of fields the
 * employer may edit and fields only MSD may. Presentational: the page supplies
 * the lead sentence, this owns the tone and the route out.
 *
 * The wording of `message` should hold true in every release. Both screens are
 * fully read-only before 1.2 and partly editable from 1.2, so a message that
 * says "some of these details" stays accurate either way — one that says
 * "nothing here is editable" would not.
 */
export default class ReadOnlyNotice extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The lead sentence, ending in a full stop. The contact line follows it. */
    @api message = 'Some of these details are held by MSD and cannot be changed here.';

    /**
     * Prefixes every `id` this renders. The page sets it to the host's own id
     * (`profile-readonly-notice`, `org-readonly-notice`): a notice is the kind
     * of thing a page could hold two of, so a fixed id here could collide.
     */
    @api idPrefix = 'read-only-notice';

    /** Keyed in camelCase — a template expression cannot hold a hyphen. */
    get ids(): Record<string, string> {
        const p = this.idPrefix || 'read-only-notice';
        const names = [
            'root', 'header', 'title', 'body', 'icon-stacked', 'contact-link-stacked',
            'inline', 'icon-inline', 'contact-link-inline'
        ];
        return Object.fromEntries(
            names.map((n) => [n.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), `${p}-${n}`])
        );
    }

    /**
     * Optional bold heading, as SEP's Info Panel draws it.
     *
     * Named `heading` rather than `title` on purpose: `title` is a global HTML
     * attribute, so an `@api title` on a light-DOM host would also set the
     * browser's native tooltip on the whole notice.
     *
     * Unset by default. With no heading the notice renders as a plain media
     * object — see the template for why it does not simply leave the row empty.
     */
    @api heading = '';
}
