import { LightningElement, api, track } from 'lwc';

export default class SearchableCombobox extends LightningElement {
    @api label       = '';
    @api placeholder = 'Select…';
    @api options     = [];

    @track open   = false;
    @track search = '';

    _value = null;

    @api
    get value() { return this._value; }
    set value(val) { this._value = val; }

    // ── Computed ─────────────────────────────────────────────────────────────

    get displayValue() {
        if (this.open) return this.search;
        const opt = (this.options || []).find(o => o.value === this._value);
        return opt ? opt.label : '';
    }

    get containerClass() {
        return 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click'
             + (this.open ? ' slds-is-open' : '');
    }

    get filteredOptions() {
        const q = this.search.toLowerCase();
        return (this.options || [])
            .filter(o => !q || o.label.toLowerCase().includes(q))
            .map(o => ({
                value:    o.value,
                label:    o.label,
                isSelected: o.value === this._value,
                itemClass: 'slds-media slds-listbox__option slds-listbox__option_plain slds-listbox__option_has-meta'
                         + (o.value === this._value ? ' slds-is-selected' : '')
            }));
    }

    get noMatches() {
        return this.search.length > 0 && this.filteredOptions.length === 0;
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    handleFocus() {
        this.search = '';
        this.open   = true;
    }

    handleInput(event) {
        this.search = event.target.value;
        this.open   = true;
    }

    handleBlur() {
        this.open   = false;
        this.search = '';
    }

    // Prevent blur when user clicks an option (mousedown fires before blur)
    handleOptionMouseDown(event) {
        event.preventDefault();
        const val = event.currentTarget.dataset.value;
        this._value = val;
        this.open   = false;
        this.search = '';
        this.dispatchEvent(new CustomEvent('change', {
            detail:   { value: val },
            bubbles:  true,
            composed: true
        }));
    }
}
