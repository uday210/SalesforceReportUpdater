import { LightningElement, track } from 'lwc';
import scanReports   from '@salesforce/apex/ReportScanController.scanReports';
import updateReports from '@salesforce/apex/ReportUpdateController.updateReports';

export default class BulkReportUpdater extends LightningElement {
    @track currentStep   = 'configure';
    @track loadedFields  = [];
    @track scanning      = false;
    @track scanResult    = null;
    @track scanError     = null;
    @track deploying     = false;
    @track deployResult  = null;
    @track deployError   = null;

    get isConfigureStep() { return this.currentStep === 'configure'; }
    get isResultsStep()   { return this.currentStep === 'results';   }
    get isDeployStep()    { return this.currentStep === 'deploy';     }

    async handleFindReports(event) {
        const { oldFieldNames, objectType, fields } = event.detail;
        this.loadedFields = fields;
        this.scanning     = true;
        this.scanError    = null;
        this.scanResult   = null;
        this.currentStep  = 'results';

        try {
            this.scanResult = await scanReports({ objectType, oldFieldNames });
        } catch (err) {
            this.scanError = err.body?.message || 'Scan failed';
        } finally {
            this.scanning = false;
        }
    }

    async handleDeploy(event) {
        const { entries } = event.detail;
        const reports = this.scanResult?.affectedReports ?? [];

        const targets = entries.flatMap(entry => {
            const report = reports.find(r => r.reportId === entry.reportId);
            if (!report) return [];
            return [{
                reportId:             report.reportId,
                reportName:           report.reportName,
                originalMetadataJson: report.originalMetadataJson,
                mappings:             entry.mappings.map(m => ({
                    oldField: m.oldField || '',
                    newField: m.newField,
                    mode:     m.mode
                }))
            }];
        });

        if (targets.length === 0) return;

        this.deploying    = true;
        this.deployError  = null;
        this.deployResult = null;
        this.currentStep  = 'deploy';

        try {
            this.deployResult = await updateReports({ targets });
        } catch (err) {
            this.deployError = err.body?.message || 'Deploy failed';
        } finally {
            this.deploying = false;
        }
    }

    handleBackToConfigure() { this.currentStep = 'configure'; }
    handleBackToResults()   { this.currentStep = 'results';   }

    handleStartOver() {
        this.currentStep  = 'configure';
        this.loadedFields = [];
        this.scanResult   = null;
        this.scanError    = null;
        this.deployResult = null;
        this.deployError  = null;
    }
}
