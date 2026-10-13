import { LightningElement, api } from 'lwc';
import { JOB_STATUS_LABELS, jobMetaItems, statusThemeClass } from 'data/vacancyRules';

/**
 * A vacancy at a glance — title, subtitle, status and who/when — for a page
 * that is ABOUT the vacancy but is not its record page: the set-outcome page
 * (Figma 570:99727). The record page has the Manage Job header instead.
 *
 * Presentational: the page fetches and passes the job down. Boxed like the
 * Manage Job header — `slds-page-header` + `slds-box`, no project CSS — and its
 * who/when lines come from the same `jobMetaItems`, so the two never differ.
 */
export default class JobSummary extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The hydrated record from `api.job()`. */
    @api job: Record<string, unknown> = {};

    /** `api.job()` does not join the creator, so the page passes it across. */
    @api creatorName = '';

    get title(): string {
        return String(this.job?.title ?? '');
    }

    get subtitle(): string {
        return String(this.job?.subtitle ?? '').trim();
    }

    get statusLabel(): string {
        const status = String(this.job?.status ?? '');
        return JOB_STATUS_LABELS[status] ?? status;
    }

    get statusClass(): string {
        return `${statusThemeClass(String(this.job?.status ?? ''))} slds-m-left_x-small`;
    }

    get metaItems() {
        return jobMetaItems(this.job ?? {}, this.creatorName);
    }
}
