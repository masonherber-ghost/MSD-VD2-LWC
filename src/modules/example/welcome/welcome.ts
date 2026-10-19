import { LightningElement } from 'lwc';
import api from 'data/api';
import { currentUser, markWelcomeSeen } from 'data/session';

/**
 * The first-time welcome page (Figma 191:8051).
 *
 * Shown once: login, registration and the homepage send a person here while
 * `contacts.first_time` is true. Viewing it clears the flag — on view rather
 * than on leaving, because every link here is a full page load, so a
 * disconnect or unload handler is not reliably run and a request made from
 * one is cancelled. The page has rendered by the time the flag clears, and
 * the flag only decides whether to be sent here again.
 *
 * Reachable directly afterwards (it just does nothing the second time).
 */

/**
 * Tile copy describes what the portal actually does: listings are drafted and
 * submitted for MSD review (draft -> in review -> published), every vacancy is
 * on My jobs with its status, and a listing is edited or closed with an
 * outcome from there. The design's book icon is not an SLDS icon; these are
 * the nearest `standard:` glyphs by meaning.
 */
const TILES = [
    {
        key: 'create',
        icon: 'standard:job_profile',
        title: 'Create job listings',
        description: 'Draft a vacancy step by step and submit it to us for review before it goes live.'
    },
    {
        key: 'vacancies',
        icon: 'standard:list_email',
        title: 'All your vacancies in one place',
        description: 'See every job you have listed, from drafts to published, with its current status at a glance.'
    },
    {
        key: 'manage',
        icon: 'standard:task',
        title: 'Manage your job listings',
        description: 'Edit a draft, review changes we suggest, and close a job with an outcome when it is filled.'
    }
];

export default class Welcome extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    tiles = TILES;
    isSignedIn = false;

    connectedCallback(): void {
        const user = currentUser();
        this.isSignedIn = user !== null;
        if (!user) {
            return;
        }

        // Locally first, so a missing API (the static build) still stops the
        // redirect loop; the server write is best-effort.
        if (user.first_time) {
            markWelcomeSeen();
            api.markWelcomeSeen(user.contact_id).catch(() => {
                // No /api in the static build — the session flag is enough there.
            });
        }
    }
}
