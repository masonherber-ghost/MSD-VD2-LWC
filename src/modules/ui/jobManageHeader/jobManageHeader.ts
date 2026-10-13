import { LightningElement, api } from 'lwc';
import { INTERVIEW_OPTIONS, labelFor } from 'data/reference';
import { isEnabled, type Release } from 'data/release';
import {
    JOB_STATUS_LABELS,
    actionsFor,
    jobMetaItems,
    statusThemeClass
} from 'data/vacancyRules';

interface MetaItem {
    key: string;
    icon: string;
    text: string;
}

interface MenuItem {
    key: string;
    label: string;
    icon: string;
    disabled: boolean;
}

/**
 * The Manage job header on a vacancy's record page: title and status, the
 * primary and overflow actions, who and when, and how the vacancy is run.
 *
 * Presentational. The page fetches the record and passes it down; this shapes
 * it and dispatches `edit` (either Edit control) and `action` (an overflow
 * menu item, `detail.value` the action key). See `rules-lwc-layout.md`
 * § The modular component rule.
 *
 * Every value is the record's own — `rules-app-logic.md` § Never invent data.
 */
export default class JobManageHeader extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** The hydrated record from `api.job()`. */
    @api job: Record<string, unknown> = {};

    /**
     * Who created it. `api.job()` does not join the creator's name;
     * `api.jobs()` does, so the page passes it across from the list row.
     */
    @api creatorName = '';

    /**
     * Passed down rather than read from the release module here, so a change
     * re-renders this. See `rules-app-logic.md` § The reactivity rule.
     */
    @api release: Release = '2+';

    get status(): string {
        return String(this.job?.status ?? '');
    }

    get statusLabel(): string {
        return JOB_STATUS_LABELS[this.status] ?? this.status;
    }

    /** The Cosmos status badge — `slds-badge` plus its `slds-theme_*`. */
    get statusTagClass(): string {
        return `${statusThemeClass(this.status)} slds-m-left_x-small`;
    }

    /** View applicants arrived with the applicant views, at 1.2. */
    get showApplicants(): boolean {
        return isEnabled('jobs.applicantCount', this.release);
    }

    /** Who and when, by state — `jobMetaItems` in `data/vacancyRules`. */
    get metaItems(): MetaItem[] {
        return jobMetaItems(this.job ?? {}, this.creatorName);
    }

    get tags(): { key: string; label: string }[] {
        const job = this.job ?? {};
        const interviews = Array.isArray(job.interview_options)
            ? (job.interview_options as string[])
            : [];

        const tags = interviews.map((slug) => ({
            key: `interview-${slug}`,
            label: labelFor(INTERVIEW_OPTIONS, slug)
        }));
        if (job.positions_available != null) {
            tags.push({ key: 'positions', label: `Positions available: ${job.positions_available}` });
        }
        if (job.max_shortlist != null) {
            tags.push({ key: 'shortlist', label: `Max shortlist: ${job.max_shortlist}` });
        }
        return tags;
    }

    /**
     * The header's actions by state, as the design draws them:
     *   draft      "Edit job", plus a menu of every draft action
     *   in review  nothing — the vacancy is with MSD
     *   published  "Close job"
     *   closed     "Delete listing"
     *
     * The draft menu is the shared set from `data/vacancyRules` (Preview is
     * left out — this page IS the preview), so it reads exactly as the
     * design's: Edit job, Submit for review, Discard job. The other states
     * use this page's own wording for a single action. Only Edit is wired.
     */
    get primaryAction(): MenuItem | null {
        switch (this.status) {
            case 'draft':
                return { key: 'edit', label: 'Edit job', icon: 'utility:edit', disabled: false };
            case 'active':
                return { key: 'close', label: 'Close job', icon: 'utility:close', disabled: false };
            case 'closed':
                return { key: 'discard', label: 'Delete listing', icon: 'utility:delete', disabled: false };
            default:
                return null;
        }
    }

    /** Draft only: the menu beside "Edit job". Empty in every other state. */
    get menuItems(): MenuItem[] {
        if (this.status !== 'draft') return [];
        return actionsFor(this.status)
            .filter((a) => a.key !== 'preview')
            .map((a) => ({ ...a, disabled: false }));
    }

    get hasMenu(): boolean {
        return this.menuItems.length > 0;
    }

    get hasActions(): boolean {
        return this.primaryAction !== null;
    }

    handleEdit(): void {
        this.dispatchEvent(new CustomEvent('edit'));
    }

    /** The group's lead button: whichever action `primaryAction` chose. */
    handlePrimary(): void {
        this.run(this.primaryAction?.key ?? '');
    }

    handleAction(event: CustomEvent): void {
        this.run((event.detail as { value?: string })?.value ?? '');
    }

    /** Edit is wired (the page opens the edit flow); the rest go up as `action`. */
    private run(value: string): void {
        if (value === 'edit') {
            this.handleEdit();
        } else if (value) {
            this.dispatchEvent(new CustomEvent('action', { detail: { value } }));
        }
    }
}
