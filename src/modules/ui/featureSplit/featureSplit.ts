import { LightningElement, api } from 'lwc';

export interface SplitItem {
    key: string;
    text: string;
}

/**
 * A half-and-half section: media on one side, a heading with prose and a
 * bulleted list on the other.
 *
 * `media-side` mirrors it. Stacked sections that all lead with the image read as
 * a template; alternating is what makes a page of them scan. The order is set
 * with an SLDS order utility rather than by swapping the markup, so the text
 * still comes first in the DOM and a screen reader hears heading before image.
 */
export default class FeatureSplit extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api heading = '';
    @api intro = '';
    @api items: SplitItem[] = [];
    @api linkLabel = '';
    @api linkHref = '#';
    @api iconName = 'standard:default';

    /** 'left' (the default) or 'right'. */
    @api mediaSide: 'left' | 'right' = 'left';

    get hasItems(): boolean {
        return this.items.length > 0;
    }

    get isMediaRight(): boolean {
        return this.mediaSide === 'right';
    }

    /*
     * The `medium` variants, not the unprefixed ones: stacked on a phone the
     * order must follow the DOM, or a media-left section opens with its image
     * and the heading arrives underneath it — two panels end up adjacent where
     * one section's image meets the next section's.
     */
    get mediaClass(): string {
        return this.isMediaRight ? 'slds-medium-order_2' : 'slds-medium-order_1';
    }

    get textClass(): string {
        return this.isMediaRight ? 'slds-medium-order_1' : 'slds-medium-order_2';
    }
}
