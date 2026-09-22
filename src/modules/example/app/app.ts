import { LightningElement } from 'lwc';

interface Section {
    id: string;
    label: string;
    title: string;
    summary: string;
}

const SECTIONS: Section[] = [
    {
        id: 'overview',
        label: 'Overview',
        title: 'Component library',
        summary: 'A standalone LWR prototype wired to the Lightning base components and SLDS 2.'
    },
    {
        id: 'buttons',
        label: 'Buttons & menus',
        title: 'Buttons & menus',
        summary: 'Actions, variants, icon buttons, stateful buttons, button groups and menus.'
    },
    {
        id: 'forms',
        label: 'Forms & inputs',
        title: 'Forms & inputs',
        summary: 'Text, picklists, dates, selection controls, sliders and validation.'
    },
    {
        id: 'data',
        label: 'Data display',
        title: 'Data display',
        summary: 'Tables, trees, tiles, avatars, badges and the formatted-output components.'
    },
    {
        id: 'feedback',
        label: 'Feedback & overlays',
        title: 'Feedback & overlays',
        summary: 'Spinners, progress, alerts, confirms, prompts and toasts.'
    },
    {
        id: 'layout',
        label: 'Layout & navigation',
        title: 'Layout & navigation',
        summary: 'Grid layout, cards, tabs, accordions, breadcrumbs and vertical navigation.'
    },
    {
        id: 'catalog',
        label: 'Full catalog',
        title: 'Full catalog',
        summary: 'Every exposed component in the installed lightning-base-components package.'
    }
];

export default class App extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    sections = SECTIONS;
    activeSection = 'overview';

    get currentSection(): Section {
        return this.sections.find((s) => s.id === this.activeSection) || this.sections[0];
    }

    get isOverview(): boolean {
        return this.activeSection === 'overview';
    }
    get isButtons(): boolean {
        return this.activeSection === 'buttons';
    }
    get isForms(): boolean {
        return this.activeSection === 'forms';
    }
    get isData(): boolean {
        return this.activeSection === 'data';
    }
    get isFeedback(): boolean {
        return this.activeSection === 'feedback';
    }
    get isLayout(): boolean {
        return this.activeSection === 'layout';
    }
    get isCatalog(): boolean {
        return this.activeSection === 'catalog';
    }

    handleNavSelect(event: CustomEvent): void {
        this.activeSection = event.detail.name;
    }

    handleSectionJump(event: CustomEvent): void {
        this.activeSection = event.detail;
    }
}
