import { LightningElement, api } from 'lwc';

/**
 * One vacancy as an out-of-the-box `lightning-card` — the /jobs3 listing.
 *
 * The same content and order as `ui/vacancyCard`, built without a stylesheet
 * of its own: the card keeps its shipped anatomy (icon, title, actions, body)
 * and is skinned only through public hooks, on `.sep-vacancy-listing` in
 * site.css. Where `ui/vacancyCard` rebuilt the header to fit the design, this
 * accepts what the card renders — that difference is the point of /jobs3.
 *
 * Presentational only: the page fetches and shapes the data, this renders it.
 */
export default class VacancyListingCard extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The shaped card from `example/jobs3`, not a raw job row. */
    @api card: Record<string, unknown> = {};

    /** Passed down so a release change re-renders — see `rules-app-logic.md`. */
    @api showApplicants = false;

    /** The menu trigger has no visible text, so its name carries the vacancy. */
    get actionsLabel(): string {
        const title = String(this.card.title ?? '').trim();
        return title ? `Actions for ${title}` : 'Actions';
    }
}
