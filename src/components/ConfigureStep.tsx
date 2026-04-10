'use client';

import { useState, useMemo } from 'react';
import type { ConnectionInfo } from './ConnectionStep';
import type { SalesforceField } from '@/lib/salesforceClient';

interface Props {
  connection: ConnectionInfo;
  onFindReports: (oldFieldNames: string[], objectType: string, loadedFields: SalesforceField[]) => void;
  onDisconnect: () => void;
}

export default function ConfigureStep({ connection, onFindReports, onDisconnect }: Props) {
  const [objectName, setObjectName] = useState('');
  const [fields, setFields] = useState<SalesforceField[] | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // ── Load fields ────────────────────────────────────────────────────────────

  async function loadFields() {
    if (!objectName.trim()) return;
    setFieldsLoading(true);
    setFieldsError(null);
    setFields(null);
    setSelectedFields(new Set());
    setSearch('');

    try {
      const res = await fetch('/api/salesforce/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectName: objectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load fields');
      setFields(data.fields as SalesforceField[]);
    } catch (err) {
      setFieldsError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setFieldsLoading(false);
    }
  }

  // ── Field selection ────────────────────────────────────────────────────────

  const filteredFields = useMemo(
    () =>
      (fields ?? []).filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.apiName.toLowerCase().includes(search.toLowerCase()),
      ),
    [fields, search],
  );

  function toggleField(apiName: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(apiName)) next.delete(apiName);
      else next.add(apiName);
      return next;
    });
  }

  function toggleAll() {
    if (selectedFields.size === filteredFields.length && filteredFields.length > 0) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(filteredFields.map((f) => f.apiName)));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields) return;
    onFindReports(
      Array.from(selectedFields),
      objectName.trim(),
      fields,
    );
  }

  const allSelected = filteredFields.length > 0 && filteredFields.every((f) => selectedFields.has(f.apiName));
  const someSelected = filteredFields.some((f) => selectedFields.has(f.apiName));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-1.5">Configure Scan</h2>
        <p className="text-sf-neutral-70 text-sm">
          Select the object and which fields to investigate. We&apos;ll find every report that references those fields.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Object input ──────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">
            Object API Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={objectName}
              onChange={(e) => { setObjectName(e.target.value); setFields(null); setFieldsError(null); setSelectedFields(new Set()); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadFields(); } }}
              placeholder="e.g. Opportunity or My_Object__c"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                         text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                         focus:ring-sf-blue focus:border-sf-blue transition font-mono"
            />
            <button
              type="button"
              onClick={loadFields}
              disabled={!objectName.trim() || fieldsLoading}
              className="px-4 py-2.5 rounded-lg bg-sf-neutral-100 hover:bg-sf-neutral-90 disabled:opacity-40
                         disabled:cursor-not-allowed text-white text-sm font-semibold transition shrink-0 flex items-center gap-2"
            >
              {fieldsLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              )}
              Load Fields
            </button>
          </div>
          {fieldsError && (
            <p className="mt-1.5 text-sm text-sf-red">{fieldsError}</p>
          )}
        </div>

        {/* ── Field list ────────────────────────────────────────────────── */}
        {fields && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-sf-neutral-90">
                Select Fields to Investigate
                <span className="ml-1.5 text-xs font-normal text-sf-neutral-70">
                  ({selectedFields.size} selected — leave all unchecked to scan all reports on this object)
                </span>
              </label>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sf-neutral-50" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                           text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2 focus:ring-sf-blue focus:border-sf-blue transition"
              />
            </div>

            {/* Select-all row */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-sf-neutral-10 border border-sf-neutral-30 rounded-t-lg">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue"
              />
              <span className="text-xs font-semibold text-sf-neutral-70 uppercase tracking-wide">
                {filteredFields.length} field{filteredFields.length !== 1 ? 's' : ''} shown
              </span>
            </div>

            {/* Field rows */}
            <div className="border border-t-0 border-sf-neutral-30 rounded-b-lg divide-y divide-sf-neutral-20 max-h-72 overflow-y-auto">
              {filteredFields.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-sf-neutral-50">No fields match</div>
              )}
              {filteredFields.map((field) => (
                <label
                  key={field.apiName}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition hover:bg-sf-neutral-10 ${
                    selectedFields.has(field.apiName) ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.apiName)}
                    onChange={() => toggleField(field.apiName)}
                    className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-sf-neutral-100 truncate">{field.label}</span>
                      <span
                        className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          field.type === 'reference'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-sf-neutral-20 text-sf-neutral-70'
                        }`}
                      >
                        {field.type === 'reference' && field.referenceTo.length > 0
                          ? `→ ${field.referenceTo.join(', ')}`
                          : field.type}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-sf-neutral-70">{field.apiName}</span>
                  </div>
                </label>
              ))}
            </div>

            {selectedFields.size > 0 && (
              <p className="mt-2 text-xs text-sf-neutral-70">
                Will search for reports using:{' '}
                <span className="font-mono text-sf-neutral-90">
                  {Array.from(selectedFields).join(', ')}
                </span>
              </p>
            )}
          </div>
        )}

        {/* ── Find Reports button ────────────────────────────────────────── */}
        {fields && (
          <button
            type="submit"
            className="w-full py-3 px-4 bg-sf-blue hover:bg-sf-blue-dark text-white font-semibold
                       rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            {selectedFields.size > 0
              ? `Find Reports using ${selectedFields.size} field${selectedFields.size !== 1 ? 's' : ''}`
              : 'Find All Reports on this Object'}
          </button>
        )}
      </form>
    </div>
  );
}
