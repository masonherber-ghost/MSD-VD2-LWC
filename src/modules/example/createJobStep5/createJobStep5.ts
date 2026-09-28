import { LightningElement } from 'lwc';
import { TRAINING_LEVELS } from 'data/reference';
import { current as currentDraft, patch as patchDraft } from 'data/jobDraft';

/**
 * Step 5 of the create-a-vacancy flow: the role's description, its selling
 * points and the training offered with it.
 *
 * All input, no fetch — the flow has no save until its last step.
 *
 * Two things the design asks for that this cannot give it:
 *
 *   1. The job description is drawn as a rich text editor with bold, italic
 *      and list controls. `lightning-base-components` ships no rich text
 *      editor (`lightning-formatted-rich-text` only RENDERS markup), so this
 *      is a plain `lightning-textarea`. SLDS 2 does ship a `richTextEditor`
 *      blueprint, but it is CSS with no behaviour behind it — writing the
 *      toolbar out of it would mean building the control, which is the gate.
 *
 *   2. The training level has no column. See TRAINING_LEVELS in data/reference.
 */
export default class CreateJobStep5 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    trainingOptions = TRAINING_LEVELS;

    /** `jobs.description`. */
    description = '';

    /** Three rows of `job_selling_points`, which the design fixes at three. */
    sellingPoints = ['', '', ''];

    /** No column holds this yet — it lives in the draft only. */
    trainingLevel = '';

    /** Which "Show example and tips" panels are open, by field name. */
    openTips: string[] = [];

    /** Hydrate from the shared draft — populated when editing a vacancy. */
    connectedCallback(): void {
        const d = currentDraft();
        this.description = d.description;
        this.trainingLevel = d.training_level;
        // The table is unbounded; this step shows exactly three.
        this.sellingPoints = [0, 1, 2].map((i) => d.selling_points[i] ?? '');
    }

    get descriptionTipsOpen(): boolean {
        return this.openTips.includes('description');
    }

    get sellingTipsOpen(): boolean {
        return this.openTips.includes('selling');
    }

    get sellingPointFields(): { key: string; index: number; label: string; value: string }[] {
        return this.sellingPoints.map((value, i) => ({
            key: `selling-point-${i}`,
            index: i,
            label: `Selling Point ${i + 1}`,
            value
        }));
    }

    handleDescription(event: Event): void {
        this.description = (event.target as HTMLTextAreaElement).value ?? '';
        patchDraft({ description: this.description });
    }

    handleSellingPoint(event: Event): void {
        const el = event.target as HTMLTextAreaElement & { dataset: DOMStringMap };
        const index = Number(el.dataset.index);
        const next = [...this.sellingPoints];
        next[index] = el.value ?? '';
        this.sellingPoints = next;
        // Empty lines are not rows: `job_selling_points` holds what was written.
        patchDraft({ selling_points: this.sellingPoints.filter(Boolean) });
    }

    handleTrainingChange(event: CustomEvent): void {
        this.trainingLevel = (event.detail as { value: string }).value;
        patchDraft({ training_level: this.trainingLevel });
    }

    handleToggleTips(event: Event): void {
        const name = (event.currentTarget as HTMLElement).dataset.tips as string;
        this.openTips = this.openTips.includes(name)
            ? this.openTips.filter((t) => t !== name)
            : [...this.openTips, name];
    }
}
