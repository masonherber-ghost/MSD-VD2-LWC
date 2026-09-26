import { LightningElement } from 'lwc';

/**
 * What the landing pad shows an employer with no vacancies yet.
 *
 * Deliberately only rendered once the account's vacancies have actually loaded
 * — telling an employer with ten vacancies to create their first is the failure
 * mode this state has to avoid. The caller owns that check; see
 * `example/home.hasNoVacancies`.
 */
export default class VacancyEmptyState extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';
}
