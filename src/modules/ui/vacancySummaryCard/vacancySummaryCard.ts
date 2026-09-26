import { api, LightningElement } from 'lwc';

/**
 * Vacancies at a glance, with the way through to manage them.
 *
 * Counts are passed in rather than fetched: the page owns the data and this
 * stays a widget an App Builder region could hold — see rules-lwc-layout.md
 * § The modular component rule.
 */
export default class VacancySummaryCard extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** Total vacancies on the account. */
    @api count = 0;
    /** How many of those are `active`. */
    @api activeCount = 0;

    /**
     * "1 vacancy", not "1 vacancies". The count comes from the API, so this is
     * presentation of real data rather than a value invented to fill the slot.
     */
    get countLabel(): string {
        return this.count === 1 ? '1 vacancy' : `${this.count} vacancies`;
    }

    get activeLabel(): string {
        return `${this.activeCount} currently active`;
    }
}
