import { LightningElement, api } from 'lwc';

type AlertVariant = 'info' | 'warning' | 'error' | 'offline';

/**
 * The SLDS Alert blueprint, in its four shipped styles: informational,
 * warning, error and offline (LDS2 "Alert Grab n Go Examples", Figma
 * 17672:464430).
 *
 * No stylesheet and no hooks. `slds-notify slds-notify_alert` IS the
 * informational style; the other three are SLDS's own modifier classes
 * (`slds-alert_warning`, `_error`, `_offline`), each of which sets the alert's
 * public `--slds-c-alert-*` hooks itself. This wrapper only picks the class,
 * the icon and the assistive text, so a screen names a variant rather than
 * repeating the markup.
 *
 * The icon is a `lightning-icon`, which the blueprint's
 * `.slds-notify_alert .slds-icon { fill: currentColor }` cannot reach — the svg
 * is inside its shadow root. Under the Cosmos theme info, warning and error are
 * PALE fills, so those take the icon's default; offline is the one dark fill
 * (neutral grey, white text), so it alone takes the `inverse` variant. The
 * icon is therefore grey, not the alert's tinted text colour.
 *
 * No close button: the blueprint draws one, but dismissing is state this
 * wrapper does not hold. An alert that needs dismissing is the screen's call.
 *
 * `role`: an error is `alert` (interrupts); the rest are `status` (polite).
 * Pass `static-message` for copy present on every render, which drops the role
 * so it is read in document order rather than announced as an update.
 */
const VARIANTS: Record<AlertVariant, { cls: string; icon: string; label: string; inverse: boolean }> = {
    info: { cls: '', icon: 'utility:info', label: 'Information', inverse: false },
    warning: { cls: 'slds-alert_warning', icon: 'utility:warning', label: 'Warning', inverse: false },
    error: { cls: 'slds-alert_error', icon: 'utility:error', label: 'Error', inverse: false },
    offline: { cls: 'slds-alert_offline', icon: 'utility:offline', label: 'Offline', inverse: true }
};

export default class Alert extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    /** `info` (default), `warning`, `error` or `offline`. */
    @api variant: AlertVariant = 'info';

    /** The alert's text. A default slot is there for a link or richer copy. */
    @api message = '';

    /** Copy that is always present, not an update — see the note above. */
    @api staticMessage = false;

    private get config() {
        return VARIANTS[this.variant] ?? VARIANTS.info;
    }

    get alertClass(): string {
        return `slds-notify slds-notify_alert ${this.config.cls}`.trim();
    }

    get role(): string | null {
        if (this.staticMessage) return null;
        return this.variant === 'error' ? 'alert' : 'status';
    }

    get iconName(): string {
        return this.config.icon;
    }

    get iconVariant(): string | null {
        return this.config.inverse ? 'inverse' : null;
    }

    get assistiveLabel(): string {
        return this.config.label;
    }
}
