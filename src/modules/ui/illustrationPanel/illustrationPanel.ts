import { LightningElement, api } from 'lwc';

/**
 * Stands in for the photography the source page uses.
 *
 * The prototype ships no imagery — `src/assets` holds a favicon and nothing
 * else — and MSD's own photographs are neither ours to copy nor available to
 * the static build. Rather than fabricate a picture, each media slot renders an
 * SLDS-tinted panel carrying the section's icon, so the layout is honest about
 * what is real and what is placeholder. Swap this component for an <img> when
 * art direction arrives; nothing above it needs to change.
 */
export default class IllustrationPanel extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** A standard: or utility: name — verify it ships before passing a new one. */
    @api iconName = 'standard:default';

    /** Describes the section this stands in for, not the icon. */
    @api alternativeText = '';
}
