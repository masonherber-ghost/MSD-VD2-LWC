import { LightningElement, api } from 'lwc';

/**
 * One vacancy as an out-of-the-box `lightning-card` — the /jobs listing.
 *
 * Content, menu and status pills from the vacancy card design (Figma
 * 445:39792). The card keeps its shipped anatomy (title, actions, body) and
 * default frame; everything inside is SLDS blueprint classes and utilities.
 * The only styling is the card's public body-spacing hooks (Figma 445:40158),
 * in `vacancyListingCard.css`.
 * Where `ui/vacancyCard` (/jobs3) rebuilt the card to fit the design, this
 * accepts what the card renders — that difference is the point of the two.
 *
 * Presentational only: the page fetches and shapes the data, this renders it.
 */
export default class VacancyListingCard extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The shaped card from `example/jobs`, not a raw job row. */
    @api card: Record<string, unknown> = {};

    /** Passed down so a release change re-renders — see `rules-app-logic.md`. */
    @api showApplicants = false;

    /** The menu trigger has no visible text, so its name carries the vacancy. */
    get actionsLabel(): string {
        const title = String(this.card.title ?? '').trim();
        return title ? `Actions for ${title}` : 'Actions';
    }
}
