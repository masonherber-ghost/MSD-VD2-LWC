import { LightningElement } from 'lwc';
import {
    EXPERIENCE_LEVELS,
    EDUCATION_LEVELS,
    DRIVER_LICENCE_CLASSES,
    LICENCE_ENDORSEMENTS,
    LICENCE_STAGES
} from 'data/reference';
import {
    current as currentDraft,
    patch as patchDraft,
    startBlank,
    editingJobId
} from 'data/jobDraft';

/**
 * Step 2 of the create-a-vacancy flow: job details — and, since step 1 (the
 * read-only company details) was removed, the flow's FIRST step. So it is
 * where a draft is started or resumed; see `resolveDraft`.
 *
 * Everything here is new information the employer supplies. It is held in `data/jobDraft`, which
 * carries it across the other step routes and is what "Edit" on a vacancy
 * seeds. Nothing is persisted: the flow has no save until its last step, and
 * `jobs` rows are created by the repository, not from here.
 *
 * The draft is copied into FIELDS on connect and those fields are reassigned on
 * every change, because a getter reading the module would record no render
 * dependency — `rules-app-logic.md` § The reactivity rule.
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

    /** Set when the flow was entered from a vacancy's Edit action. */
    editingTitle = '';

    /** Hydrate from the shared draft — populated when editing a vacancy. */
    connectedCallback(): void {
        this.resolveDraft();
        const d = currentDraft();
        this.draft = {
            title: d.title,
            occupation_id: d.occupation_id,
            experience_level: d.experience_level,
            education_required: d.education_required,
            certification: d.certification
        };
        this.licenceStageByClass = { ...d.driver_licence_stages };
        this.selectedEndorsements = [...d.licence_endorsements];
    }

    /**
     * The flow's entry point decides whether this is an edit or a new vacancy.
     *
     * This step is BOTH the entry point and where step 3's Previous lands, so
     * it must not start blank on every visit — that would wipe the employer's
     * answers when they step back. Three cases:
     *
     *   ?edit=<id> matching the draft   "Edit" on a vacancy seeded the draft
     *                                    (`startFromJob`) — keep it.
     *   ?start=new, or a stale ?edit=    a fresh vacancy — start blank, so a
     *                                    draft abandoned earlier in this tab
     *                                    cannot leak into it. Every "List a
     *                                    job" entry link carries ?start=new.
     *   no parameter                     returning within the flow — keep
     *                                    whatever the draft holds.
     *
     * The editing notice follows the draft, not the URL, so it still shows
     * after stepping back. Moved here from the removed step 1, which started
     * blank on every visit without ?edit.
     */
    private resolveDraft(): void {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const wanted = Number(params.get('edit'));
        const isMatchingEdit =
            Number.isInteger(wanted) && wanted > 0 && editingJobId() === wanted;
        if (!isMatchingEdit && (params.has('edit') || params.get('start') === 'new')) {
            startBlank();
        }
        this.editingTitle = editingJobId() !== null ? currentDraft().title : '';
    }

    get isEditing(): boolean {
        return this.editingTitle !== '';
    }

    get editingNotice(): string {
        return `You are editing “${this.editingTitle}”. Your answers are filled in from the vacancy — change what you need and carry on.`;
    }

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
        patchDraft({ [field]: this.draft[field] });
    }

    handleLicenceStageChange(event: CustomEvent): void {
        const cls = (event.target as HTMLElement).dataset.class;
        if (!cls) return;
        this.licenceStageByClass = {
            ...this.licenceStageByClass,
            [cls]: (event.target as HTMLInputElement).value ?? ''
        };
        patchDraft({ driver_licence_stages: this.licenceStageByClass });
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
        patchDraft({ licence_endorsements: this.selectedEndorsements });
    }
}
