import { LightningElement } from 'lwc';
import {
    ROLE_STRENGTHS,
    MAX_STRENGTHS,
    LANGUAGE_ABILITIES,
    SUGGESTED_SKILLS
} from 'data/reference';

const VISIBLE_SUGGESTIONS = 3;

/** One language panel — `job_languages` + its `job_language_abilities`. */
type LanguageEntry = { id: number; name: string; abilities: string[]; saved: boolean };

/**
 * Step 4 of the create-a-vacancy flow: skills, strengths and languages.
 *
 * All input, no fetch. The flow has no save until its last step, so "Save" on a
 * language panel marks it complete in the draft rather than writing anything.
 */
export default class CreateJobStep4 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    strengthOptions = ROLE_STRENGTHS;
    abilityOptions = LANGUAGE_ABILITIES;

    skillQuery = '';
    /** `job_skills.skill_name`. */
    selectedSkills: string[] = [];
    selectedStrengths: string[] = [];
    showAllSuggestions = false;

    languages: LanguageEntry[] = [
        { id: 1, name: 'English', abilities: [], saved: false }
    ];
    private nextLanguageId = 2;

    // -- Skills -------------------------------------------------------------

    get suggestions(): { key: string; name: string }[] {
        const list = this.showAllSuggestions
            ? SUGGESTED_SKILLS
            : SUGGESTED_SKILLS.slice(0, VISIBLE_SUGGESTIONS);
        return list
            .filter((s) => !this.selectedSkills.includes(s))
            .map((s) => ({ key: s, name: s }));
    }

    get hiddenSuggestionCount(): number {
        return Math.max(SUGGESTED_SKILLS.length - VISIBLE_SUGGESTIONS, 0);
    }

    get hasMoreSuggestions(): boolean {
        return this.hiddenSuggestionCount > 0;
    }

    /** "Show 02 more" — the design pads the count to two digits. */
    get moreLabel(): string {
        const n = this.hiddenSuggestionCount;
        return this.showAllSuggestions
            ? 'Show fewer'
            : `Show ${String(n).padStart(2, '0')} more`;
    }

    get moreIcon(): string {
        return this.showAllSuggestions ? 'utility:up' : 'utility:down';
    }

    get chosenSkills(): { key: string; name: string }[] {
        return this.selectedSkills.map((s) => ({ key: s, name: s }));
    }

    get hasChosenSkills(): boolean {
        return this.selectedSkills.length > 0;
    }

    handleSkillQuery(event: CustomEvent): void {
        this.skillQuery = (event.target as HTMLInputElement).value ?? '';
    }

    /** Enter adds whatever has been typed — `change` cannot report a keypress. */
    handleSkillKeyUp(event: KeyboardEvent): void {
        if (event.key !== 'Enter') return;
        this.addSkill(this.skillQuery.trim());
        this.skillQuery = '';
    }

    handleAddSuggestion(event: Event): void {
        const name = (event.currentTarget as HTMLElement).dataset.skill;
        if (name) this.addSkill(name);
    }

    handleRemoveSkill(event: CustomEvent): void {
        const name = (event.target as HTMLElement & { name?: string }).name;
        this.selectedSkills = this.selectedSkills.filter((s) => s !== name);
    }

    private addSkill(name: string): void {
        if (!name || this.selectedSkills.includes(name)) return;
        this.selectedSkills = [...this.selectedSkills, name];
    }

    toggleSuggestions(): void {
        this.showAllSuggestions = !this.showAllSuggestions;
    }

    // -- Strengths ----------------------------------------------------------

    /**
     * The design says "Select up to 4". `lightning-checkbox-group` has no max,
     * so the cap is enforced here: once four are chosen, a fifth is ignored and
     * the previous selection stands.
     */
    handleStrengthChange(event: CustomEvent): void {
        const next = (event.detail as { value: string[] }).value ?? [];
        if (next.length > MAX_STRENGTHS) return;
        this.selectedStrengths = next;
    }

    get strengthsHelp(): string {
        return `Select up to ${MAX_STRENGTHS}`;
    }

    // -- Languages ----------------------------------------------------------

    get languagePanels(): (LanguageEntry & { saveLabel: string })[] {
        return this.languages.map((l) => ({
            ...l,
            saveLabel: l.saved ? 'Saved' : 'Save'
        }));
    }

    /** Inverted for the template: LWC has no negation in an expression. */
    get addLanguageDisabled(): boolean {
        return !this.languages.every((l) => l.saved);
    }

    handleAbilityChange(event: CustomEvent): void {
        const id = Number((event.target as HTMLElement).dataset.language);
        const abilities = (event.detail as { value: string[] }).value ?? [];
        this.languages = this.languages.map((l) =>
            l.id === id ? { ...l, abilities, saved: false } : l
        );
    }

    handleLanguageName(event: CustomEvent): void {
        const id = Number((event.target as HTMLElement).dataset.language);
        const name = (event.target as HTMLInputElement).value ?? '';
        this.languages = this.languages.map((l) =>
            l.id === id ? { ...l, name, saved: false } : l
        );
    }

    handleSaveLanguage(event: Event): void {
        const id = Number((event.currentTarget as HTMLElement).dataset.language);
        this.languages = this.languages.map((l) =>
            l.id === id ? { ...l, saved: true } : l
        );
    }

    handleAddLanguage(): void {
        this.languages = [
            ...this.languages,
            { id: this.nextLanguageId, name: '', abilities: [], saved: false }
        ];
        this.nextLanguageId += 1;
    }
}
