import { LightningElement, track } from 'lwc';
import getObjectFields from '@salesforce/apex/ObjectFieldsController.getObjectFields';

export default class ConfigureStep extends LightningElement {
    @track objectName    = '';
    @track fields        = null;
    @track loadingFields = false;
    @track fieldsError   = null;
    @track search        = '';
    @track selectedNames = new Set();

    // ── Computed ──────────────────────────────────────────────────────────────

    get loadDisabled() { return !this.objectName.trim() || this.loadingFields; }
    get hasFields()    { return !!this.fields && this.fields.length > 0; }

    get filteredFields() {
        const q = this.search.toLowerCase();
        return (this.fields || [])
            .filter(f => f.label.toLowerCase().includes(q) || f.apiName.toLowerCase().includes(q))
            .map(f => ({
                ...f,
                selected:       this.selectedNames.has(f.apiName),
                rowClass:       'field-row slds-p-around_x-small' + (this.selectedNames.has(f.apiName) ? ' selected' : ''),
                typeLabel:      f.type === 'reference' && f.referenceTo?.length
                                  ? '→ ' + f.referenceTo[0]
                                  : f.type,
                typeBadgeClass: f.type === 'reference' ? 'badge-reference' : 'badge-default'
            }));
    }

    get allSelected() {
        return this.filteredFields.length > 0 &&
               this.filteredFields.every(f => this.selectedNames.has(f.apiName));
    }

    get selectedCount()      { return this.selectedNames.size; }
    get filteredCountLabel() { return `${this.filteredFields.length} field(s) shown`; }
    get noFieldsMatch()      { return this.hasFields && this.filteredFields.length === 0; }

    get findReportsLabel() {
        return this.selectedNames.size > 0
            ? `Find Reports using ${this.selectedNames.size} field(s)`
            : 'Find All Reports on this Object';
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    handleObjectNameChange(event) {
        this.objectName    = event.target.value;
        this.fields        = null;
        this.fieldsError   = null;
        this.selectedNames = new Set();
        this.search        = '';
    }

    handleKeyUp(event) {
        if (event.key === 'Enter') this.handleLoadFields();
    }

    async handleLoadFields() {
        if (!this.objectName.trim()) return;
        this.loadingFields = true;
        this.fieldsError   = null;
        this.fields        = null;
        this.selectedNames = new Set();
        this.search        = '';

        try {
            this.fields = await getObjectFields({ objectName: this.objectName.trim() });
        } catch (err) {
            this.fieldsError = err.body?.message || 'Failed to load fields';
        } finally {
            this.loadingFields = false;
        }
    }

    handleSearch(event) {
        this.search = event.target.value || '';
    }

    handleFieldToggle(event) {
        const apiName = event.target.dataset.apiname;
        const next    = new Set(this.selectedNames);
        if (event.target.checked) next.add(apiName);
        else next.delete(apiName);
        this.selectedNames = next;
    }

    toggleAll() {
        if (this.allSelected) {
            this.selectedNames = new Set();
        } else {
            this.selectedNames = new Set(this.filteredFields.map(f => f.apiName));
        }
    }

    handleFindReports() {
        if (!this.fields) return;
        this.dispatchEvent(new CustomEvent('findreports', {
            detail: {
                oldFieldNames: [...this.selectedNames],
                objectType:    this.objectName.trim(),
                fields:        this.fields
            }
        }));
    }
}
