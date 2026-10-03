import { LightningElement, api } from 'lwc';
import { INTERVIEW_OPTIONS, labelFor } from 'data/reference';
import { isEnabled, type Release } from 'data/release';
import {
    JOB_STATUS_LABELS,
    actionsFor,
    closingText,
    noActionsReason,
    statusTagClass
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

/** Labels this header words differently from the shared action set. */
const HEADER_LABELS: Record<string, string> = {
    close: 'Close job'
};

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

    get statusTagClass(): string {
        return statusTagClass(this.status);
    }

    /** View applicants arrived with the applicant views, at 1.2. */
    get showApplicants(): boolean {
        return isEnabled('jobs.applicantCount', this.release);
    }

    /**
     * Only lines the record actually holds; a missing value is left out rather
     * than shown as a dash, as on the /jobs cards. Who manages it, when it
     * closes, when it starts — the posted date and the vacancy contact are
     * deliberately not shown here.
     *
     * `start_date` is free text in the data ("12 October 2025"), so it is
     * shown as written rather than reformatted to the design's dd/mm/yy.
     */
    get metaItems(): MetaItem[] {
        const job = this.job ?? {};
        const start = String(job.start_date ?? '').trim();

        const items: MetaItem[] = [];
        const push = (key: string, icon: string, text: string) => {
            if (text.trim()) items.push({ key, icon, text });
        };
        push('owner', 'utility:user', this.creatorName ? `Managed by ${this.creatorName}` : '');
        push('closes', 'utility:date_input', closingText(this.status, job.closing_date));
        push('starts', 'utility:date_time', start ? `Start date ${start}` : '');
        return items;
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

    /** Edit appears only where the lifecycle allows it — the same rule as the cards. */
    get canEdit(): boolean {
        return actionsFor(this.status, this.release).some((a) => a.key === 'edit');
    }

    /**
     * Every action this header offers, in menu order: the lifecycle actions
     * from `data/vacancyRules` plus what only this page adds.
     *
     * Two adjustments to the shared set, both specific to this header:
     *   - Close reads "Close job" — on the record page the verb needs its
     *     object; on a card, inside the vacancy, "Close" already has one.
     *   - "Set job outcome" — a PLACEHOLDER behind `jobDetail.setOutcome`.
     *     Offered once a vacancy has been live (active or closed), since there
     *     is no outcome before that. Unwired, and the data has nowhere to store
     *     an outcome yet.
     */
    get actions(): MenuItem[] {
        const items: MenuItem[] = actionsFor(this.status, this.release).map((a) => ({
            ...a,
            label: HEADER_LABELS[a.key] ?? a.label,
            disabled: false
        }));
        if (
            isEnabled('jobDetail.setOutcome', this.release) &&
            (this.status === 'active' || this.status === 'closed')
        ) {
            items.push({ key: 'outcome', label: 'Set job outcome', icon: 'utility:task', disabled: false });
        }
        return items;
    }

    /**
     * The action that leads the button group, as a button rather than a menu
     * item. On a live vacancy that is "Set job outcome" — the thing an employer
     * comes back to a running job to do. Everywhere else it is Edit, where the
     * lifecycle allows editing at all. Null when neither applies, which leaves
     * the group as the menu alone.
     */
    get primaryAction(): MenuItem | null {
        const preferred = this.status === 'active' ? ['outcome', 'edit'] : ['edit'];
        for (const key of preferred) {
            const found = this.actions.find((a) => a.key === key);
            if (found) return found;
        }
        return null;
    }

    /** The menu: every other action. Never empty — see `noActionsReason`. */
    get menuItems(): MenuItem[] {
        const primary = this.primaryAction?.key;
        const items = this.actions.filter((a) => a.key !== primary);
        return items.length
            ? items
            : [{ key: 'none', label: noActionsReason(this.status), icon: '', disabled: true }];
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
