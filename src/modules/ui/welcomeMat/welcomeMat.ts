import { LightningElement, api } from 'lwc';

type Tile = { key: string; icon: string; title: string; description: string; href: string };

/**
 * The employer's orientation panel on the dashboard — SLDS's welcome mat.
 *
 * Presentational: the page supplies the heading, the lead paragraph and the
 * tiles. Built from the SLDS blueprint because `lightning-base-components`
 * ships no welcome-mat component; see the template.
 */
export default class WelcomeMat extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api heading = '';
    @api description = '';

    /** One entry per tile: key, icon, title, description, href. */
    @api tiles: Tile[] = [];
}
