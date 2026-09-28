import { LightningElement } from 'lwc';
import { PUBLISH_TIMING, INTERVIEW_OPTIONS } from 'data/reference';
import { current as currentDraft, patch as patchDraft } from 'data/jobDraft';

/**
 * Step 6 of the create-a-vacancy flow: when the listing is published, how many
 * positions and shortlist places it has, and which interview formats are
 * offered.
 *
 * Every field here has a column behind it, which is not true of the steps
 * before it: `jobs.posted_date`, `jobs.positions_available`,
 * `jobs.max_shortlist` and `jobs.interview_options`. Still nothing is written —
 * the flow has no save until its last step.
 */
export default class CreateJobStep6 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    timingOptions = PUBLISH_TIMING;
    interviewOptions = INTERVIEW_OPTIONS;

    /** Defaults are the design's own. */
    publishTiming = 'asap';
    /** `jobs.posted_date`. Only asked for when a date was chosen. */
    publishDate = '';
    positions = '1';
    maxShortlist = '10';
    selectedInterviewOptions: string[] = [];

    /** Hydrate from the shared draft — populated when editing a vacancy. */
    connectedCallback(): void {
        const d = currentDraft();
        this.publishTiming = d.publish_timing;
        this.publishDate = d.posted_date;
        this.positions = d.positions_available;
        this.maxShortlist = d.max_shortlist;
        this.selectedInterviewOptions = [...d.interview_options];
    }

    /** The date field is the one region the design does not draw — see below. */
    get showPublishDate(): boolean {
        return this.publishTiming === 'scheduled';
    }

    handleTimingChange(event: CustomEvent): void {
        this.publishTiming = (event.detail as { value: string }).value;
        if (this.publishTiming !== 'scheduled') this.publishDate = '';
        patchDraft({ publish_timing: this.publishTiming, posted_date: this.publishDate });
    }

    handlePublishDate(event: Event): void {
        this.publishDate = (event.target as HTMLInputElement).value ?? '';
        patchDraft({ posted_date: this.publishDate });
    }

    handlePositions(event: Event): void {
        this.positions = (event.target as HTMLInputElement).value ?? '';
        patchDraft({ positions_available: this.positions });
    }

    handleMaxShortlist(event: Event): void {
        this.maxShortlist = (event.target as HTMLInputElement).value ?? '';
        patchDraft({ max_shortlist: this.maxShortlist });
    }

    handleInterviewChange(event: CustomEvent): void {
        this.selectedInterviewOptions = (event.detail as { value: string[] }).value ?? [];
        patchDraft({ interview_options: this.selectedInterviewOptions });
    }
}
