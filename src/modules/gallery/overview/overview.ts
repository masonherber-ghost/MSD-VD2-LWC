import { LightningElement } from 'lwc';
import COMPONENTS from 'data/catalog';

export default class Overview extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    componentCount = COMPONENTS.length;

    usageCode = `<!-- Any of the base components can be dropped straight into a template -->
<template>
    <lightning-card title="Account" icon-name="standard:account">
        <lightning-input label="Name"></lightning-input>
        <lightning-button variant="brand" label="Save"></lightning-button>
    </lightning-card>
</template>`;

    handleJump(event: Event): void {
        const section = (event.currentTarget as HTMLElement).dataset.section;
        this.dispatchEvent(new CustomEvent('navigate', { detail: section }));
    }
}
