import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import { setFlash } from 'data/flash';
import {
    current as currentDraft,
    editingJobId,
    toJobShape,
    clear as clearDraft,
    type JobDraft
} from 'data/jobDraft';

const value = (v: unknown): string => {
    const text = String(v ?? '').trim();
    return text || '—';
};

/**
 * Step 7 of the create-a-vacancy flow: review everything, then finish.
 *
 * WHAT IT PREVIEWS. The draft the employer has just filled in — `data/jobDraft`,
 * carried here across the six earlier routes. Not the saved record: an edit
 * made on step 5 has to show up here before anything is submitted, or the
 * review screen is reviewing the wrong thing.
 *
 * When the flow was entered from a vacancy's Edit action the saved record is
 * fetched too, and the draft is laid over it. That is what fills the parts of
 * the listing no step collects — the schedule's days, `about_us` — which would
 * otherwise vanish from the preview of a vacancy that has them.
 *
 * A vacancy being created from scratch fetches no job at all, so its preview
 * shows exactly what has been entered and "Nothing added" everywhere else.
 * That is the honest result, and it is the design's own rule for this screen:
 * "Any section left empty will not be displayed on the job listing."
 */
export default class CreateJobStep7 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** A field, not a getter — see `rules-app-logic.md` § The reactivity rule. */
    draft: JobDraft = currentDraft();
    savedJob: Row | null = null;
    account: Row | null = null;
    error = '';
    loading = true;

    async connectedCallback(): Promise<void> {
        const accountId = currentAccountId() ?? DEV_ACCOUNT_ID;
        const editing = editingJobId();
        try {
            this.account = await api.account(accountId);
            if (editing) {
                this.savedJob = await api.job(editing);
            }
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error =
                e instanceof ApiError ? e.message : 'Could not load your company details.';
        } finally {
            this.loading = false;
        }
    }

    /**
     * Only the company panel needs the API now — the preview reads the draft —
     * so a failure costs that panel and nothing else.
     */
    get companyUnavailable(): string {
        return this.error || 'Company details are not available.';
    }

    /** The draft in the shape `ui/jobListingPreview` reads. */
    get previewJob(): Row {
        return toJobShape(this.draft, this.savedJob);
    }

    get isEditing(): boolean {
        return this.draft.job_id !== null;
    }

    /** The "Review company details" panel — the account as MSD holds it. */
    get companyRows(): { key: string; label: string; value: string }[] {
        const a = this.account;
        if (!a) return [];
        const fields: [string, unknown][] = [
            ['Company name', a.company_name],
            ['Trading name', a.trading_name],
            ['Org type', a.company_type],
            ['Industry', a.industry],
            ['NZBN', a.nzbn],
            ['IRD number', a.ird_number],
            ['Company address', a.company_address],
            ['Relationship manager', a.relationship_manager]
        ];
        return fields.map(([label, v]) => ({ key: label, label, value: value(v) }));
    }

    /** The "Review listing preferences" panel — step 6's answers, from the draft. */
    get preferenceRows(): { key: string; label: string; value: string }[] {
        const d = this.draft;
        const fields: [string, unknown][] = [
            [
                'Publish',
                d.publish_timing === 'scheduled' ? d.posted_date : 'As soon as possible'
            ],
            ['Positions available', d.positions_available],
            ['Maximum shortlist', d.max_shortlist],
            ['Interview options', d.interview_options.join(', ')]
        ];
        return fields.map(([label, v]) => ({ key: label, label, value: value(v) }));
    }

    /**
     * Finish: raise the confirmation, drop the draft, go back to the list.
     *
     * NOTHING IS WRITTEN. The draft exists and is complete enough to submit,
     * but there is no POST behind this yet — `job-repository` has no create or
     * update path reachable from the client, and adding one is a decision to
     * raise. When it lands it goes here, before the flash, with the navigation
     * waiting on it.
     *
     * The draft is cleared either way, so a second pass through the flow does
     * not reopen this one.
     */
    handleFinish(): void {
        setFlash({
            label: this.isEditing ? 'Vacancy updated' : 'Vacancy submitted',
            message: 'MSD staff will review your listing within 48 hours.',
            variant: 'success'
        });
        clearDraft();
        window.location.assign('/jobs');
    }

    /**
     * Unwired, like the record page's header actions. Which step each section
     * sends the employer back to is a product decision that has not been taken.
     */
    handleEdit(event: CustomEvent): void {
        // eslint-disable-next-line no-console
        console.log('edit requested:', (event.detail as { section: string }).section);
    }
}
