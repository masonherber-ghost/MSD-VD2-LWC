import { LightningElement } from 'lwc';

const CRUMBS = [
    { label: 'Accounts', name: 'accounts' },
    { label: 'Acme Corporation', name: 'acme' },
    { label: 'Contacts', name: 'contacts' }
];

export default class Layout extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    crumbs = CRUMBS;

    layoutCode = `<lightning-layout multiple-rows="true" horizontal-align="spread">
    <lightning-layout-item size="4" padding="around-small">One</lightning-layout-item>
    <lightning-layout-item size="4" padding="around-small">Two</lightning-layout-item>
    <lightning-layout-item size="4" padding="around-small">Three</lightning-layout-item>
</lightning-layout>`;
}
