import LightningModal from 'lightning/modal';

/**
 * "Publish job listing" — confirms the employer has looked at MSD's changes
 * before a `reviewed` vacancy goes live (Figma 570:104519).
 *
 * The shipped `LightningModal`, subclassed only for its copy and its two
 * buttons — `LightningConfirm` fixes its buttons to OK / Cancel, and the design
 * names them Cancel / Publish. Open with
 * `PublishJobModal.open({ label: 'Publish job listing', size: 'small' })`.
 *
 * Resolves to `'publish'`, or `undefined` for Cancel and the ×.
 *
 * Shadow DOM, as every LightningModal is: SLDS utility classes would be inert
 * in here, so the template uses none.
 */
export default class PublishJobModal extends LightningModal {
    handleCancel(): void {
        this.close();
    }

    handlePublish(): void {
        this.close('publish');
    }
}
