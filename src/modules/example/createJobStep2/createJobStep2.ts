import { LightningElement } from 'lwc';
import {
    EXPERIENCE_LEVELS,
    EDUCATION_LEVELS,
    DRIVER_LICENCE_CLASSES,
    LICENCE_ENDORSEMENTS,
    LICENCE_STAGES
} from 'data/reference';

/**
 * Step 2 of the create-a-vacancy flow: job details.
 *
 * Unlike step 1, which shows back MSD's record read-only, everything here is
 * new information the employer supplies — so these are real inputs held in a
 * draft. Nothing is persisted yet: the flow has no save until its last step,
 * and `jobs` rows are created by the repository, not from here.
 */
export default class CreateJobStep2 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    experienceLevels = EXPERIENCE_LEVELS;
    educationLevels = EDUCATION_LEVELS;
    licenceClasses = DRIVER_LICENCE_CLASSES;
    endorsements = LICENCE_ENDORSEMENTS;

    /**
     * The step's draft. Reassigned rather than mutated on every change: LWC
     * tracks the FIELD, so mutating a property in place would not re-render.
     */
    draft: Record<string, string> = {
        title: '',
        occupation_id: '',
        experience_level: '',
        education_required: '',
        certification: ''
    };

    licenceStages = LICENCE_STAGES;

    /**
     * The chosen stage per licence class — `job_driver_licences.stage`, keyed
     * by `class_value`.
     *
     * A class is not a yes/no: selecting one means saying which stage it needs,
     * which is why the design expands each class rather than ticking it. A
     * class with no stage, or `none`, is simply not required for the job.
     *
     * Reassigned rather than mutated, so LWC sees the field change.
     */
    licenceStageByClass: Record<string, string> = {};

    /** `job_licence_endorsements.endorsement` — multi-select. */
    selectedEndorsements: string[] = [];

    handleFieldChange(event: CustomEvent): void {
        const field = (event.target as HTMLElement).dataset.field;
        if (!field) return;
        this.draft = {
            ...this.draft,
            [field]: (event.target as HTMLInputElement).value ?? ''
        };
    }

    handleLicenceStageChange(event: CustomEvent): void {
        const cls = (event.target as HTMLElement).dataset.class;
        if (!cls) return;
        this.licenceStageByClass = {
            ...this.licenceStageByClass,
            [cls]: (event.target as HTMLInputElement).value ?? ''
        };
    }

    /**
     * One entry per class, carrying its currently chosen stage so each section
     * can bind its own combobox value. Built here because a template cannot
     * index an object by a loop variable.
     */
    get licenceSections(): { value: string; label: string; stage: string }[] {
        return this.licenceClasses.map((c) => ({
            value: c.value,
            label: c.label,
            stage: this.licenceStageByClass[c.value] ?? ''
        }));
    }

    handleEndorsementChange(event: CustomEvent): void {
        this.selectedEndorsements = (event.detail as { value: string[] }).value ?? [];
    }
}
