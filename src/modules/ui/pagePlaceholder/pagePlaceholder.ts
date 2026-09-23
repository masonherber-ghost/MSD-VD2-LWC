import { LightningElement, api } from 'lwc';

/**
 * Page-header shell for the nav destinations that have no screen yet, so every
 * link in the global header resolves instead of 404ing.
 */
export default class PagePlaceholder extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api current = '';
    @api heading = '';
    @api iconName = 'standard:default';
    @api message = '';
}
