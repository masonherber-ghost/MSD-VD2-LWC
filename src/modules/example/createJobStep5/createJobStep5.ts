import { LightningElement } from 'lwc';
import { TRAINING_LEVELS } from 'data/reference';

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
    }

    handleSellingPoint(event: Event): void {
        const el = event.target as HTMLTextAreaElement & { dataset: DOMStringMap };
        const index = Number(el.dataset.index);
        const next = [...this.sellingPoints];
        next[index] = el.value ?? '';
        this.sellingPoints = next;
    }

    handleTrainingChange(event: CustomEvent): void {
        this.trainingLevel = (event.detail as { value: string }).value;
    }

    handleToggleTips(event: Event): void {
        const name = (event.currentTarget as HTMLElement).dataset.tips as string;
        this.openTips = this.openTips.includes(name)
            ? this.openTips.filter((t) => t !== name)
            : [...this.openTips, name];
    }
}
