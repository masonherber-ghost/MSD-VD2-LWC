import { LightningElement, api } from 'lwc';

/**
 * One vacancy, as a full-width card for the /jobs list.
 *
 * Presentational only: the page fetches and shapes the data, this renders it.
 * That keeps it liftable into a DX project and droppable into an App Builder
 * region — see `rules-lwc-layout.md` § The modular component rule.
 */
export default class VacancyCard extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The shaped card from `example/jobs`, not a raw job row. */
    @api card: Record<string, unknown> = {};

    /**
     * Passed down rather than read from the release module here: a getter that
     * reads a module records no render dependency, so the card would not
     * re-render when the release toggle moved. See `rules-app-logic.md`
     * § The reactivity rule.
     */
    @api showApplicants = false;
}
