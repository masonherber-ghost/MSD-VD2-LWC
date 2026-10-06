import { LightningElement, api } from 'lwc';
import { VACANCY_STEPS, labelForStep } from 'data/reference';

/**
 * The step rail for the create-a-vacancy flow.
 *
 * Each step is its own route, so the rail has to be a shared component rather
 * than page state — every step route renders this with its own `current-step`.
 */
export default class VacancyStepper extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The step this route is, as a value from VACANCY_STEPS. */
    @api currentStep = '2';

    steps = VACANCY_STEPS;

    get currentStepLabel(): string {
        return labelForStep(this.currentStep);
    }

    /**
     * One caption cell per step, so each sits under its own dot.
     *
     * Every step gets a cell — the row mirrors the rail's `space-between`
     * distribution, so dropping the other cells would move the one that is
     * left. They are hidden with `visibility`, not `display`, for the same
     * reason: `display: none` would remove them from the flex distribution and
     * the visible caption would drift off its dot. `visibility: hidden` also
     * takes them out of the accessibility tree, so only the current step's
     * label is announced.
     */
    get labelCells(): { value: string; label: string; className: string }[] {
        return this.steps.map((step) => ({
            value: step.value,
            label: step.label,
            className:
                step.value === this.currentStep
                    ? 'vacancy-stepper__label'
                    : 'vacancy-stepper__label vacancy-stepper__label_hidden'
        }));
    }
}
