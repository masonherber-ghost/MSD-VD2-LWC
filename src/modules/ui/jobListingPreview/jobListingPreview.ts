import { LightningElement, api } from 'lwc';
import { TRAINING_LEVELS } from 'data/reference';

type Row = Record<string, unknown>;

interface Chip {
    key: string;
    label: string;
}

interface Box {
    key: string;
    title: string;
    chips: Chip[];
}

interface AboutSection {
    key: string;
    heading: string;
    section: string;
    isChips: boolean;
    isBoxes: boolean;
    chips: Chip[];
    boxes: Box[];
    isEmpty: boolean;
    emptyText: string;
}

const text = (value: unknown): string => String(value ?? '').trim();

const chips = (values: unknown, prefix: string): Chip[] =>
    ((values as string[]) ?? []).map((label, i) => ({ key: `${prefix}-${i}`, label }));

/**
 * One vacancy rendered as the candidate would see it.
 *
 * Used twice, which is the whole point of it being here rather than inside a
 * page: the last step of the create-a-vacancy flow previews the listing before
 * it is submitted, and `/jobs/job-detail` shows the same thing for a vacancy
 * that already exists. `editable` is the only difference — the flow puts an
 * Edit control on each section, the record page does not.
 *
 * Presentational only. The page fetches and passes `job` down whole; this
 * shapes it for display and dispatches `edit` when one of those controls is
 * pressed. See `rules-lwc-layout.md` § The modular component rule.
 *
 * TWO REGIONS THE DATA CANNOT FILL, both already known:
 *
 *   - **Important strengths.** There is no job strengths table. `job_skills`,
 *     `job_languages` and the rest all exist; strengths exist only on
 *     `candidate_strengths`, which is the other side of the match.
 *   - **On-the-job training.** No column holds it. The create flow collects it
 *     on step 5 and passes it in through `training-level`; a saved vacancy has
 *     nowhere to have kept it, so the record page shows the empty state.
 *
 * Neither is filled with a plausible value. Both render the same "Nothing
 * added" state a genuinely empty section gets.
 */
export default class JobListingPreview extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** A hydrated job row — `JobDetail` in `server/types.ts`. */
    @api job: Row = {};

    /** The flow shows an Edit control per section; the record page does not. */
    @api editable = false;

    /**
     * `TRAINING_LEVELS` value from step 5. No column holds this, so it is
     * passed in rather than read off the job.
     */
    @api trainingLevel = '';

    // -- header --------------------------------------------------------------

    get title(): string {
        return text(this.job.title);
    }

    get subtitle(): string {
        return text(this.job.subtitle);
    }

    get location(): string {
        return text(this.job.location);
    }

    /**
     * Only the rows the record holds. A missing value is left out rather than
     * shown as an em dash — the design's own rule for this screen, stated on it:
     * "Any section left empty will not be displayed on the job listing."
     */
    get facts(): { key: string; icon: string; label: string; value: string }[] {
        const out: { key: string; icon: string; label: string; value: string }[] = [];
        const push = (key: string, icon: string, label: string, value: unknown) => {
            const v = text(value);
            if (v) out.push({ key, icon, label, value: v });
        };
        push('pay', 'utility:moneybag', 'Pay', this.job.pay);
        push('contract', 'utility:contract', 'Contract', this.job.contract_type);
        push('start', 'utility:event', 'Start date', this.job.start_date);
        push('hours', 'utility:event', 'Hours', this.job.hours_description);
        return out;
    }

    // -- left column ---------------------------------------------------------

    get description(): string {
        return text(this.job.description);
    }

    get hasDescription(): boolean {
        return this.description !== '';
    }

    get sellingPoints(): Chip[] {
        return chips(this.job.selling_points, 'sp');
    }

    get hasSellingPoints(): boolean {
        return this.sellingPoints.length > 0;
    }

    /** Label plus description, resolved from the step 5 list. */
    get training(): { label: string; description: string } | null {
        const found = TRAINING_LEVELS.find((t) => t.value === this.trainingLevel);
        return found ? { label: found.label, description: found.description } : null;
    }

    get hasTraining(): boolean {
        return this.training !== null;
    }

    get preEmploymentChecks(): Chip[] {
        return chips(this.job.pre_employment_checks, 'pec');
    }

    get hasPreEmploymentChecks(): boolean {
        return this.preEmploymentChecks.length > 0;
    }

    // -- work schedule -------------------------------------------------------

    private get schedule(): Row {
        return (this.job.schedule as Row) ?? {};
    }

    get scheduleType(): string {
        return text(this.schedule.schedule_type);
    }

    get scheduleDays(): Chip[] {
        return chips(this.schedule.days, 'day');
    }

    get hasScheduleDays(): boolean {
        return this.scheduleDays.length > 0;
    }

    get scheduleHours(): string {
        return text(this.schedule.hours);
    }

    get scheduleAdditional(): string {
        return text(this.schedule.additional_info);
    }

    get hasSchedule(): boolean {
        return (
            this.scheduleType !== '' ||
            this.hasScheduleDays ||
            this.scheduleHours !== '' ||
            this.scheduleAdditional !== ''
        );
    }

    // -- right card ----------------------------------------------------------

    /**
     * "About the job", in the design's order. One list rather than seven blocks
     * of near-identical markup: the sections only differ in whether they hold
     * chips or boxes of chips, and the template branches on that.
     */
    get aboutSections(): AboutSection[] {
        const languages = ((this.job.languages as Row[]) ?? []).map((l, i) => ({
            key: `lang-${i}`,
            title: text(l.language_name),
            chips: chips(l.abilities, `lang-${i}-a`)
        }));

        const licences = ((this.job.driver_licences as Row[]) ?? []).map((l, i) => ({
            key: `lic-${i}`,
            title: text(l.class_label) || text(l.class_value),
            chips: text(l.stage) ? [{ key: `lic-${i}-s`, label: text(l.stage) }] : []
        }));

        const experience = text(this.job.experience_level);

        const asChips = (
            key: string,
            heading: string,
            section: string,
            list: Chip[],
            emptyText = 'Nothing added'
        ): AboutSection => ({
            key,
            heading,
            section,
            isChips: true,
            isBoxes: false,
            chips: list,
            boxes: [],
            isEmpty: list.length === 0,
            emptyText
        });

        const asBoxes = (
            key: string,
            heading: string,
            section: string,
            list: Box[]
        ): AboutSection => ({
            key,
            heading,
            section,
            isChips: false,
            isBoxes: true,
            chips: [],
            boxes: list,
            isEmpty: list.length === 0,
            emptyText: 'Nothing added'
        });

        return [
            asChips(
                'strengths',
                'Important strengths',
                'strengths',
                [],
                'No table holds job strengths yet'
            ),
            asChips('skills', 'Important skills', 'skills', chips(this.job.skills, 'skill')),
            asBoxes('languages', 'Languages', 'languages', languages),
            asChips(
                'study',
                'Study or training',
                'study',
                chips(this.job.certificates, 'cert')
            ),
            asBoxes('licences', 'NZ driver licence', 'licences', licences),
            asChips(
                'endorsements',
                'Endorsements needed',
                'endorsements',
                chips(this.job.licence_endorsements, 'end')
            ),
            asChips(
                'experience',
                'Work experience',
                'experience',
                experience ? [{ key: 'exp-0', label: experience }] : []
            )
        ];
    }

    // -- edit ----------------------------------------------------------------

    /**
     * Which section the employer asked to change. The page decides what that
     * means — on the record page nothing listens, which is the same state the
     * header actions on `example/jobDetail` are in.
     */
    handleEdit(event: Event): void {
        const section = (event.currentTarget as HTMLElement).dataset.section ?? '';
        this.dispatchEvent(new CustomEvent('edit', { detail: { section } }));
    }
}
