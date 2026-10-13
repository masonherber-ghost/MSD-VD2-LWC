import { LightningElement, api } from 'lwc';

/** The three outcomes, worded as the design has them (Figma 570:99727). */
export const OUTCOMES = [
    {
        value: 'filled',
        label: 'The job is filled',
        description: 'We have hired candidates for the job and filled the required positions'
    },
    {
        value: 'partly_filled',
        label: 'We filled some of the positions for this job',
        description:
            'We have filled some of the job positions, but there are some positions still open'
    },
    {
        value: 'not_filled',
        label: 'I want to close the job',
        description: 'We did not find suitable candidates for the job position/s'
    }
];

/**
 * The "Close this job" form on the set-outcome page: why the vacancy is
 * closing, and any details. Presentational — it dispatches `submit` with
 * `{ outcome, details }` and the page decides what happens next (the Keep job
 * active modal, the API call, where to go).
 *
 * Built from shipped parts: `ui/radioBoxGroup` (a radio per bordered box, the
 * project's composition of `lightning-input type="radio"`), `lightning-textarea`
 * and `lightning-button`. No stylesheet.
 */
export default class JobOutcomeForm extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** While the page is saving: the button disables so it is not sent twice. */
    @api busy = false;

    outcomes = OUTCOMES;
    outcome = '';
    details = '';

    /** An outcome is required — Submit waits for one. */
    get submitDisabled(): boolean {
        return this.busy || this.outcome === '';
    }

    handleOutcome(event: CustomEvent): void {
        this.outcome = (event.detail as { value?: string })?.value ?? '';
    }

    handleDetails(event: Event): void {
        this.details = (event.target as HTMLTextAreaElement).value ?? '';
    }

    handleSubmit(): void {
        if (this.submitDisabled) return;
        this.dispatchEvent(
            new CustomEvent('submit', {
                detail: { outcome: this.outcome, details: this.details.trim() }
            })
        );
    }
}
