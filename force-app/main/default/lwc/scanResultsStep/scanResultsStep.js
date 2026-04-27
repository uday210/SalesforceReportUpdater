import { LightningElement, api, track } from 'lwc';

let _nextId = 1;
function uid() { return String(_nextId++); }

export default class ScanResultsStep extends LightningElement {

    @api scanning  = false;
    @api scanError = null;

    // available-fields passed from parent (all fields for the object)
    @api availableFields = [];

    // ── scan-result setter initialises per-report state ──────────────────────
    _scanResult = null;
    @track reportMappings = {};  // { [reportId]: [{id, oldField, newField, mode}] }
    @track expandedMap    = {};  // { [reportId]: boolean }
    @track selectedMap    = {};  // { [reportId]: boolean }

    @api
    get scanResult() { return this._scanResult; }
    set scanResult(val) {
        this._scanResult = val;
        if (val && val.affectedReports) {
            const rm = {};
            const em = {};
            const sm = {};
            val.affectedReports.forEach(r => {
                rm[r.reportId] = [];
                em[r.reportId] = false;
                sm[r.reportId] = true;
            });
            this.reportMappings = rm;
            this.expandedMap    = em;
            this.selectedMap    = sm;
        }
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    get hasResults() {
        return !this.scanning && (this._scanResult !== null || this.scanError !== null);
    }

    get noReports() {
        return this._scanResult && (!this._scanResult.affectedReports || this._scanResult.affectedReports.length === 0);
    }

    get hasScanErrors() {
        return this._scanResult && this._scanResult.errors && this._scanResult.errors.length > 0;
    }

    get availableFieldOptions() {
        return (this.availableFields || []).map(f => ({
            label: f.label + ' (' + f.apiName + ')',
            value: f.apiName
        }));
    }

    get processedReports() {
        if (!this._scanResult || !this._scanResult.affectedReports) return [];
        return this._scanResult.affectedReports.map(report => {
            const mappings   = (this.reportMappings[report.reportId] || []);
            const isExpanded = !!this.expandedMap[report.reportId];
            const isSelected = this.selectedMap[report.reportId] !== false;

            // Fields already in this report (for add-alongside exclusion)
            const existingFields = new Set(
                (report.foundFields || []).map(f => (typeof f === 'string' ? f : f.apiName).toLowerCase())
            );

            const processedMappings = mappings.map(m => {
                const isReplaceMode = m.mode !== 'keep-both';
                // addable options = available fields excluding fields already in report
                const addableOptions = (this.availableFields || [])
                    .filter(f => !existingFields.has(f.apiName.toLowerCase()))
                    .map(f => ({ label: f.label + ' (' + f.apiName + ')', value: f.apiName }));

                return {
                    ...m,
                    isReplaceMode,
                    addableOptions,
                    replaceVariant: isReplaceMode  ? 'brand' : 'neutral',
                    addVariant:     !isReplaceMode ? 'brand' : 'neutral'
                };
            });

            const hasMappings = processedMappings.length > 0;
            const allComplete = processedMappings.every(m =>
                m.newField && (m.mode === 'keep-both' || m.oldField)
            );

            let statusLabel, badgeClass;
            if (hasMappings && allComplete) {
                statusLabel = 'Ready';
                badgeClass  = 'slds-badge slds-theme_success';
            } else if (hasMappings) {
                statusLabel = 'Incomplete';
                badgeClass  = 'slds-badge slds-theme_warning';
            } else {
                statusLabel = 'No ops';
                badgeClass  = 'slds-badge';
            }

            return {
                reportId:    report.reportId,
                reportName:  report.reportName,
                folderName:  report.folderName || '',
                isSelected,
                isExpanded,
                hasMappings,
                mappings:    processedMappings,
                statusLabel,
                badgeClass,
                expandIcon:  isExpanded ? 'utility:chevronup' : 'utility:chevrondown',
                cardClass:   'report-card slds-card slds-m-bottom_x-small' + (isSelected ? '' : ' card-deselected')
            };
        });
    }

    get selectedCount() {
        return Object.values(this.selectedMap).filter(Boolean).length;
    }

    get totalCount() {
        return this._scanResult?.affectedReports?.length || 0;
    }

    get allSelected() {
        return this.totalCount > 0 && this.selectedCount === this.totalCount;
    }

    get deployDisabled() {
        return !!this.deployBlockReason;
    }

    get deployBlockReason() {
        if (this.selectedCount === 0) return 'Select at least one report';
        const selected = this.processedReports.filter(r => r.isSelected);
        const withOps  = selected.filter(r => r.hasMappings);
        if (withOps.length === 0) return 'Add at least one field operation';
        const incomplete = withOps.filter(r =>
            r.mappings.some(m => !m.newField || (m.mode !== 'keep-both' && !m.oldField))
        );
        if (incomplete.length > 0) return `${incomplete.length} report(s) have incomplete operations`;
        return null;
    }

    get deployLabel() {
        return `Deploy ${this.selectedCount} Report${this.selectedCount !== 1 ? 's' : ''}`;
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    handleBack() {
        this.dispatchEvent(new CustomEvent('back'));
    }

    handleToggleExpand(event) {
        const reportId = event.currentTarget.dataset.reportId;
        this.expandedMap = { ...this.expandedMap, [reportId]: !this.expandedMap[reportId] };
    }

    handleReportToggle(event) {
        const reportId = event.currentTarget.dataset.reportId;
        this.selectedMap = { ...this.selectedMap, [reportId]: event.target.checked };
    }

    toggleSelectAll() {
        const newVal = !this.allSelected;
        const next = {};
        Object.keys(this.selectedMap).forEach(id => { next[id] = newVal; });
        this.selectedMap = next;
    }

    handleAddMapping(event) {
        const reportId = event.currentTarget.dataset.reportId;
        const current  = this.reportMappings[reportId] || [];
        this.reportMappings = {
            ...this.reportMappings,
            [reportId]: [...current, { id: uid(), oldField: null, newField: null, mode: 'replace' }]
        };
        // Auto-expand
        this.expandedMap = { ...this.expandedMap, [reportId]: true };
    }

    handleRemoveMapping(event) {
        const { reportId, mappingId } = event.currentTarget.dataset;
        const current = this.reportMappings[reportId] || [];
        this.reportMappings = {
            ...this.reportMappings,
            [reportId]: current.filter(m => m.id !== mappingId)
        };
    }

    handleModeChange(event) {
        const { reportId, mappingId, mode } = event.currentTarget.dataset;
        const current = this.reportMappings[reportId] || [];
        this.reportMappings = {
            ...this.reportMappings,
            [reportId]: current.map(m => {
                if (m.id !== mappingId) return m;
                return { ...m, mode, oldField: mode === 'keep-both' ? null : m.oldField };
            })
        };
    }

    handleFieldChange(event) {
        const { reportId, mappingId, role } = event.currentTarget.dataset;
        const value   = event.detail.value;
        const current = this.reportMappings[reportId] || [];
        this.reportMappings = {
            ...this.reportMappings,
            [reportId]: current.map(m => {
                if (m.id !== mappingId) return m;
                if (role === 'from') return { ...m, oldField: value };
                return { ...m, newField: value };
            })
        };
    }

    handleDeploy() {
        const entries = this.processedReports
            .filter(r => r.isSelected && r.hasMappings)
            .map(r => ({
                reportId: r.reportId,
                mappings: r.mappings.map(m => ({
                    oldField: m.mode === 'keep-both' ? '' : (m.oldField || ''),
                    newField: m.newField || '',
                    mode:     m.mode
                }))
            }));

        this.dispatchEvent(new CustomEvent('deploy', { detail: { entries } }));
    }
}
