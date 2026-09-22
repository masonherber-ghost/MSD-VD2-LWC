import { LightningElement } from 'lwc';

const INDUSTRY_OPTIONS = [
    { label: 'Agriculture', value: 'agriculture' },
    { label: 'Construction', value: 'construction' },
    { label: 'Education', value: 'education' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Technology', value: 'technology' }
];

const CONTACT_OPTIONS = [
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Post', value: 'post' }
];

export default class Forms extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    industryOptions = INDUSTRY_OPTIONS;
    contactOptions = CONTACT_OPTIONS;
    selectedContact = ['email'];
    sliderValue = 40;

    inputCode = `<lightning-input label="Company name" required></lightning-input>
<lightning-input type="email" label="Email"></lightning-input>
<lightning-input type="date" label="Start date"></lightning-input>`;

    selectionCode = `<lightning-combobox label="Industry" options={industryOptions}></lightning-combobox>
<lightning-radio-group label="Contact" options={contactOptions} type="radio"></lightning-radio-group>
<lightning-checkbox-group label="Preferences" options={contactOptions}></lightning-checkbox-group>`;

    handleSliderChange(event: CustomEvent): void {
        this.sliderValue = (event.target as HTMLInputElement & { value: number }).value;
    }

    handleValidate(): void {
        const inputs = this.querySelectorAll<HTMLElement & { reportValidity?: () => boolean }>(
            'lightning-input, lightning-combobox, lightning-textarea'
        );
        inputs.forEach((input) => input.reportValidity?.());
    }
}
