import { LightningElement } from 'lwc';
import api, { ApiError, DEV_ACCOUNT_ID, type Row } from 'data/api';
import { currentAccountId } from 'data/session';
import { setFlash } from 'data/flash';
import KeepJobActiveModal from 'ui/keepJobActiveModal';

/** `?id=` from the URL, or null. Guarded for the static build. */
function requestedId(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * /jobs/set-outcome — closing a published vacancy, with the employer's reason
 * (Figma 570:99727, EMP-005 "Record outcome and close a vacancy"). Reached from
 * Close job on a /jobs card and on the job's record page.
 *
 * The page owns the data and the flow; its regions are widgets:
 *   ui/jobSummary         the vacancy at a glance
 *   ui/jobOutcomeForm     why it is closing, and any details
 *   ui/keepJobActiveModal asked only when no one suitable was found
 *
 * The flow (Figma 570:100155 and 570:100222):
 *   Submit, any outcome  -> "Keep job active?" modal
 *        Close job       -> record page, toast; status unchanged
 *        Keep job active -> record page, toast; status unchanged
 *        × (dismissed)   -> stay on this page
 *
 * A prototype step: nothing is saved — not the outcome, not the details, not a
 * status change — and no notification is sent; the toast is the design's copy.
 * (`POST /api/jobs/:id/close` exists for when closing becomes real; this page
 * does not call it.)
 *
 * The toast is raised with `setFlash` and shown by the record page on arrival:
 * this site is one document per route, so a toast shown here would be torn
 * down by the navigation. See `data/flash`.
 */
export default class SetOutcome extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    jobs: Row[] = [];
    job: Row | null = null;
    loading = true;
    error = '';

    async connectedCallback(): Promise<void> {
        try {
            // The list row carries `creator_name`, which `api.job()` does not.
            this.jobs = await api.jobs(currentAccountId() ?? DEV_ACCOUNT_ID);
            const wanted = requestedId();
            const known = this.jobs.find((j) => Number(j.id) === wanted);
            if (known) {
                this.job = await api.job(Number(known.id));
            }
        } catch (e) {
            // The static build has no /api, so this is an expected state there.
            this.error = e instanceof ApiError ? e.message : 'Could not load this vacancy.';
        } finally {
            this.loading = false;
        }
    }

    // -- state ---------------------------------------------------------------

    get hasError(): boolean {
        return Boolean(this.error);
    }

    get hasJob(): boolean {
        return !this.loading && !this.error && this.job !== null;
    }

    get notFound(): boolean {
        return !this.loading && !this.error && this.job === null;
    }

    /** Only a published vacancy can be closed — the server enforces it too. */
    get isPublished(): boolean {
        return String(this.job?.status ?? '') === 'active';
    }

    get title(): string {
        return String(this.job?.title ?? '');
    }

    get recordHref(): string {
        return `/jobs/job-detail?id=${this.job?.id ?? ''}`;
    }

    get creatorName(): string {
        const row = this.jobs.find((j) => Number(j.id) === Number(this.job?.id));
        return String(row?.creator_name ?? '');
    }

    // -- flow ----------------------------------------------------------------

    handleBack(): void {
        window.location.assign(this.recordHref);
    }

    /**
     * Any outcome: ask "Keep job active?" first. Either button returns to the
     * record page with the confirmation toast, and the vacancy's status is
     * left exactly as it was — the prototype records nothing (the outcome and
     * the details are not saved). Dismissing with the × stays on this page.
     */
    async handleSubmit(): Promise<void> {
        const choice = await KeepJobActiveModal.open({ label: 'Keep job active', size: 'small' });
        if (choice !== 'close' && choice !== 'keep') {
            return;
        }
        setFlash({
            label: 'A message has been sent to your relationship manager to help find more candidates.',
            variant: 'success'
        });
        window.location.assign(this.recordHref);
    }
}
