import { LightningElement } from 'lwc';
import LightningAlert from 'lightning/alert';
import LightningConfirm from 'lightning/confirm';
import LightningPrompt from 'lightning/prompt';
import Toast from 'lightning/toast';

export default class Feedback extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';

    showSpinner = false;
    progress = 45;
    lastResult = 'nothing yet';

    overlayCode = `import LightningAlert from 'lightning/alert';

await LightningAlert.open({
    message: 'Saved successfully.',
    theme: 'success',
    label: 'Done'
});`;

    async handleAlert(): Promise<void> {
        await LightningAlert.open({
            message: 'The record has been saved.',
            theme: 'success',
            label: 'Saved'
        });
        this.lastResult = 'alert dismissed';
    }

    async handleConfirm(): Promise<void> {
        const result = await LightningConfirm.open({
            message: 'Delete this record? This cannot be undone.',
            theme: 'warning',
            label: 'Confirm delete'
        });
        this.lastResult = `confirm returned ${result}`;
    }

    async handlePrompt(): Promise<void> {
        const result = await LightningPrompt.open({
            message: 'Name this view',
            label: 'New view',
            defaultValue: 'My view'
        });
        this.lastResult = `prompt returned ${result}`;
    }

    handleToast(): void {
        // Toast.show creates the lightning-toast-container on demand, so this
        // works standalone -- no Lightning Experience host required.
        Toast.show(
            {
                label: 'Record updated',
                message: 'Acme Corporation was saved.',
                variant: 'success',
                mode: 'dismissible'
            },
            this
        );
    }

    handleSpinner(): void {
        this.showSpinner = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.showSpinner = false;
        }, 1500);
    }

    handleProgress(): void {
        this.progress = this.progress >= 100 ? 0 : this.progress + 15;
    }
}
