import { LightningElement, api } from 'lwc';

export interface FeatureCard {
    key: string;
    iconName: string;
    title: string;
    body: string;
}

/**
 * A row of equal-weight cards under one heading — the "three things we do"
 * block every service landing page has.
 *
 * Composed from `lightning-card` and `lightning-icon`; the card count is
 * whatever the caller passes, three per row from the medium breakpoint up.
 */
export default class FeatureCards extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api heading = '';
    @api intro = '';
    @api cards: FeatureCard[] = [];
    @api linkLabel = '';
    @api linkHref = '#';
}
