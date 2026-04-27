import { LightningElement, api } from 'lwc';

export default class DeployStep extends LightningElement {
    @api deploying    = false;
    @api deployResult = null;
    @api deployError  = null;

    get hasResult()  { return !this.deploying && this.deployResult !== null; }
    get hasUpdated() { return this.deployResult?.updated?.length > 0; }
    get hasErrors()  { return this.deployResult?.errors?.length  > 0; }
    get updatedCount() { return this.deployResult?.updated?.length || 0; }
    get errorCount()   { return this.deployResult?.errors?.length  || 0; }

    handleBack()      { this.dispatchEvent(new CustomEvent('back')); }
    handleStartOver() { this.dispatchEvent(new CustomEvent('startover')); }
}
