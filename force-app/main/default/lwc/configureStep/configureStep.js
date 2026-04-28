import { LightningElement, track } from 'lwc';
import getObjectFields  from '@salesforce/apex/ObjectFieldsController.getObjectFields';
import getReportFolders from '@salesforce/apex/ReportScanController.getReportFolders';

export default class ConfigureStep extends LightningElement {

    // ── Mode ─────────────────────────────────────────────────────────────────
    @track mode = 'object'; // 'object' | 'name' | 'folder' | 'all'

    get isObjectMode() { return this.mode === 'object'; }
    get isNameMode()   { return this.mode === 'name';   }
    get isFolderMode() { return this.mode === 'folder'; }
    get isAllMode()    { return this.mode === 'all';    }

    _modeClass(m) { return 'mode-btn' + (this.mode === m ? ' mode-btn_active' : ''); }
    get modeClass_object() { return this._modeClass('object'); }
    get modeClass_name()   { return this._modeClass('name');   }
    get modeClass_folder() { return this._modeClass('folder'); }
    get modeClass_all()    { return this._modeClass('all');    }

    setModeObject() { this.mode = 'object'; }
    setModeName()   { this.mode = 'name';   }
    setModeFolder() { this.mode = 'folder'; }
    setModeAll()    { this.mode = 'all';    }

    // ── Mode 1: Object & Fields ───────────────────────────────────────────────
    @track objectName    = '';
    @track fields        = null;
    @track loadingFields = false;
    @track fieldsError   = null;
    @track search        = '';
    @track selectedNames = new Set();

    get loadDisabled()       { return !this.objectName.trim() || this.loadingFields; }
    get hasFields()          { return !!this.fields && this.fields.length > 0; }
    get selectedCount()      { return this.selectedNames.size; }
    get noFieldsMatch()      { return this.hasFields && this.filteredFields.length === 0; }
    get filteredCountLabel() { return `${this.filteredFields.length} field(s) shown`; }

    get filteredFields() {
        const q = this.search.toLowerCase();
        return (this.fields || [])
            .filter(f => f.label.toLowerCase().includes(q) || f.apiName.toLowerCase().includes(q))
            .map(f => ({
                ...f,
                selected:       this.selectedNames.has(f.apiName),
                rowClass:       'field-row slds-p-around_x-small' + (this.selectedNames.has(f.apiName) ? ' selected' : ''),
                typeLabel:      f.type === 'reference' && f.referenceTo?.length ? '→ ' + f.referenceTo[0] : f.type,
                typeBadgeClass: f.type === 'reference' ? 'badge-reference' : 'badge-default'
            }));
    }

    get allSelected() {
        return this.filteredFields.length > 0 && this.filteredFields.every(f => this.selectedNames.has(f.apiName));
    }

    get findReportsLabel() {
        return this.selectedNames.size > 0
            ? `Find Reports using ${this.selectedNames.size} field(s)`
            : 'Find All Reports on this Object';
    }

    handleObjectNameChange(event) {
        this.objectName    = event.target.value;
        this.fields        = null;
        this.fieldsError   = null;
        this.selectedNames = new Set();
        this.search        = '';
    }
    handleKeyUp(event) { if (event.key === 'Enter') this.handleLoadFields(); }

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

    handleSearch(event)      { this.search = event.target.value || ''; }
    handleFieldToggle(event) {
        const apiName = event.target.dataset.apiname;
        const next    = new Set(this.selectedNames);
        if (event.target.checked) next.add(apiName); else next.delete(apiName);
        this.selectedNames = next;
    }
    toggleAll() {
        this.selectedNames = this.allSelected
            ? new Set()
            : new Set(this.filteredFields.map(f => f.apiName));
    }

    // ── Mode 2: By Name ───────────────────────────────────────────────────────
    @track namePattern = '';
    get nameSearchDisabled() { return !this.namePattern.trim(); }
    handleNamePatternChange(event) { this.namePattern = event.target.value || ''; }
    handleNameKeyUp(event) { if (event.key === 'Enter' && !this.nameSearchDisabled) this.handleFindReports(); }

    // ── Mode 3: By Folder ──────────────────────────────────────────────────────
    @track folders         = null;
    @track loadingFolders  = false;
    @track selectedFolders = new Set();

    get hasFolders()          { return this.folders !== null; }
    get selectedFolderCount() { return this.selectedFolders.size; }
    get folderSearchDisabled(){ return this.selectedFolders.size === 0; }
    get findByFolderLabel()   {
        return this.selectedFolders.size > 0
            ? `Find Reports in ${this.selectedFolders.size} folder(s)`
            : 'Select at least one folder';
    }
    get folderOptions() {
        return (this.folders || []).map(f => ({ name: f, selected: this.selectedFolders.has(f) }));
    }

    async handleLoadFolders() {
        this.loadingFolders = true;
        try {
            this.folders         = await getReportFolders();
            this.selectedFolders = new Set();
        } catch (err) {
            // leave folders null so button stays visible
        } finally {
            this.loadingFolders = false;
        }
    }
    handleFolderToggle(event) {
        const folder = event.target.dataset.folder;
        const next   = new Set(this.selectedFolders);
        if (event.target.checked) next.add(folder); else next.delete(folder);
        this.selectedFolders = next;
    }

    // ── Shared: fire findreports event ────────────────────────────────────────
    handleFindReports() {
        if (this.mode === 'object') {
            if (!this.fields) return;
            this.dispatchEvent(new CustomEvent('findreports', {
                detail: {
                    mode:          'object',
                    oldFieldNames: [...this.selectedNames],
                    objectType:    this.objectName.trim(),
                    fields:        this.fields
                }
            }));
        } else if (this.mode === 'name') {
            this.dispatchEvent(new CustomEvent('findreports', {
                detail: { mode: 'name', namePattern: this.namePattern.trim(), fields: [] }
            }));
        } else if (this.mode === 'folder') {
            this.dispatchEvent(new CustomEvent('findreports', {
                detail: { mode: 'folder', folderNames: [...this.selectedFolders], fields: [] }
            }));
        } else {
            this.dispatchEvent(new CustomEvent('findreports', {
                detail: { mode: 'all', fields: [] }
            }));
        }
    }
}
