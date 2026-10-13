import LightningModal from 'lightning/modal';

/**
 * "Keep job active" — asked when an employer closes a vacancy because they did
 * not find anyone (Figma 570:100221). Offers MSD's help before the vacancy
 * closes.
 *
 * The shipped `LightningModal`, subclassed only to set its body copy and its
 * two buttons — `LightningConfirm` fixes its buttons to OK / Cancel, and the
 * design names them. Open with
 * `KeepJobActiveModal.open({ label: 'Keep job active', size: 'small' })`.
 *
 * Resolves to `'keep'`, `'close'`, or `undefined` when dismissed with the ×
 * (treated as "changed my mind" — nothing happens).
 *
 * Shadow DOM, as every LightningModal is: SLDS utility classes would be inert
 * in here, so the template uses none.
 */
export default class KeepJobActiveModal extends LightningModal {
    handleClose(): void {
        this.close('close');
    }

    handleKeep(): void {
        this.close('keep');
    }
}
