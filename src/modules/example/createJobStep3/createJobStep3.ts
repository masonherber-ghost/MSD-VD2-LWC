import { LightningElement } from 'lwc';
import {
    WORKPLACE_ARRANGEMENTS,
    EMPLOYMENT_TYPES,
    START_OPTIONS,
    WORK_HOURS,
    WORK_SCHEDULES,
    PAY_TYPES,
    SHOW_PAY_OPTIONS,
    PRE_EMPLOYMENT_CHECKS
} from 'data/reference';

type Option = { value: string; label: string; description?: string };
type Marked = Option & { checked: boolean };

/**
 * Step 3 of the create-a-vacancy flow: location, terms and pay.
 *
 * All input, no fetch — nothing here is MSD's record. Held in a draft; the flow
 * has no save until its last step.
 *
 * Each choice renders as one `slds-box` holding a `lightning-input type="radio"`
 * plus its description. That is a shipped container around a shipped control
 * with NO custom CSS, which is what makes the card look reachable — the radio
 * group's options are `{label, value}` only and cannot carry a description.
 *
 * `lightning-input` passes `name` through to the real inner `<input>`, so radios
 * in separate boxes still group as one selection. Note its own assertion:
 * `required` is NOT supported on a radio input and belongs on the group, which
 * is why the asterisks live on each `<legend>`.
 */
export default class CreateJobStep3 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    preEmploymentChecks = PRE_EMPLOYMENT_CHECKS;

    /** Reassigned, never mutated — LWC tracks the field, not its properties. */
    draft: Record<string, string> = {
        workplace_arrangement: '',
        contract_type: '',
        start_option: '',
        start_date: '',
        work_hours: '',
        hours_per_week: '',
        schedule_type: '',
        pay_type: '',
        pay_from: '',
        pay_to: '',
        // The design ships this one pre-selected.
        show_pay: 'yes'
    };

    selectedChecks: string[] = [];

    /** Options with the current selection flagged, so each box can bind it. */
    private mark(list: readonly Option[], selected: string): Marked[] {
        return list.map((o) => ({ ...o, checked: o.value === selected }));
    }

    get workplaceOptions(): Marked[] {
        return this.mark(WORKPLACE_ARRANGEMENTS, this.draft.workplace_arrangement);
    }
    get employmentTypeOptions(): Marked[] {
        return this.mark(EMPLOYMENT_TYPES, this.draft.contract_type);
    }
    get startOptionList(): Marked[] {
        return this.mark(START_OPTIONS, this.draft.start_option);
    }
    get workHoursOptions(): Marked[] {
        return this.mark(WORK_HOURS, this.draft.work_hours);
    }
    get workScheduleOptions(): Marked[] {
        return this.mark(WORK_SCHEDULES, this.draft.schedule_type);
    }
    get payTypeOptions(): Marked[] {
        return this.mark(PAY_TYPES, this.draft.pay_type);
    }
    get showPayChoices(): Marked[] {
        return this.mark(SHOW_PAY_OPTIONS, this.draft.show_pay);
    }

    /**
     * One handler for every radio. A `type="radio"` change fires on the input
     * that was just selected, so its own `value` is the group's new value —
     * there is no need to inspect the others.
     */
    handleRadioChange(event: CustomEvent): void {
        const target = event.target as HTMLInputElement & { dataset: DOMStringMap };
        const field = target.dataset.field;
        if (!field) return;
        this.draft = { ...this.draft, [field]: target.value ?? '' };
    }

    handleInputChange(event: CustomEvent): void {
        const field = (event.target as HTMLElement).dataset.field;
        if (!field) return;
        this.draft = {
            ...this.draft,
            [field]: (event.target as HTMLInputElement).value ?? ''
        };
    }

    handleChecksChange(event: CustomEvent): void {
        this.selectedChecks = (event.detail as { value: string[] }).value ?? [];
    }

    /** "Set date" is the only start option that needs a date field. */
    get showStartDate(): boolean {
        return this.draft.start_option === 'set_date';
    }

    get payFromLabel(): string {
        return this.draft.pay_type === 'salary' ? 'From (annual)' : 'From';
    }
}
