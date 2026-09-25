import { LightningElement, api } from 'lwc';

/** A heading over one or more paragraphs of prose. The plainest section there is. */
export default class ContentSection extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    @api heading = '';

    /** `slds-text-longform` styles the paragraphs, so each is a plain string. */
    @api paragraphs: { key: string; text: string }[] = [];
}
