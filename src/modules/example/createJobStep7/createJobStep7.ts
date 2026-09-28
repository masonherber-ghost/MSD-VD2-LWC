import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';

const value = (v: unknown): string => {
    const text = String(v ?? '').trim();
    return text || '—';
};

/**
 * Step 7 of the create-a-vacancy flow: review everything, then finish.
 *
 * WHAT IT IS PREVIEWING, AND WHY. The flow has no draft store — each
 * `/create-job/stepN` is its own route with its own local state, and nothing
 * is written until the end. So there is no in-progress vacancy for this step
 * to render. Rather than fabricate one, it loads a REAL vacancy off the
 * account and previews that, the same way `example/jobDetail` picks a record.
 * Every value on screen therefore comes from the database.
 *
 * Giving the flow a genuine draft that survives between steps is a real piece
 * of work and a decision to raise, not to quietly patch around here.
 *
 * The preview itself is `ui/jobListingPreview`, shared with the record page —
 * this step passes `editable` so each section gets an Edit control.
 */
export default class CreateJobStep7 extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    job: Row | null = null;
    account: Row | null = null;
    error = '';
    loading = true;

    async connectedCallback(): Promise<void> {
        const accountId = currentAccountId() ?? DEV_ACCOUNT_ID;
        try {
            const [jobs, account] = await Promise.all([
                api.jobs(accountId),
                api.account(accountId)
            ]);
            this.account = account;
            if (jobs.length) {
                this.job = await api.job(Number(jobs[0].id));
            }
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error =
                e instanceof ApiError ? e.message : 'Could not load the listing to review.';
        } finally {
            this.loading = false;
        }
    }

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasJob(): boolean {
        return !this.loading && !this.error && this.job !== null;
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

    /** The "Review listing preferences" panel — step 6's fields, as saved. */
    get preferenceRows(): { key: string; label: string; value: string }[] {
        const j = this.job;
        if (!j) return [];
        const interviews = (j.interview_options as string[]) ?? [];
        const fields: [string, unknown][] = [
            ['Publish date', j.posted_date],
            ['Positions available', j.positions_available],
            ['Maximum shortlist', j.max_shortlist],
            ['Interview options', interviews.join(', ')],
            ['Campaign length', j.campaign_length_weeks ? `${j.campaign_length_weeks} weeks` : ''],
            ['Closing date', j.closing_date]
        ];
        return fields.map(([label, v]) => ({ key: label, label, value: value(v) }));
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
