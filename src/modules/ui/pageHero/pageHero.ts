import { LightningElement, api } from 'lwc';

/**
 * The banner a marketing landing page opens with: headline, a line of promise,
 * one primary action, and a media slot beside it.
 *
 * There is no Lightning hero component — the library is Lightning *base*
 * components, which cover controls, not marketing furniture. This is layout and
 * type around a shipped `lightning-button`, which is composition rather than a
 * new control.
 */
export default class PageHero extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api heading = '';
    @api body = '';
    @api ctaLabel = '';
    @api ctaHref = '#';
    @api iconName = 'standard:default';
}
