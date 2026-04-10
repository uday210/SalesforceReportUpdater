'use client';

import { useState, useMemo, useEffect } from 'react';
import type { AffectedReport, FieldMapping, FieldMappingMode } from '@/lib/reportUtils';
import type { ScanResponseBody } from '@/app/api/reports/scan/route';
import type { SalesforceField } from '@/lib/salesforceClient';

interface MappingEntry {
  id: number;
  oldField: SalesforceField | null;
  newField: SalesforceField | null;
  mode: FieldMappingMode;
}

let _nextId = 0;

interface Props {
  scanning: boolean;
  scanResult: ScanResponseBody | null;
  scanError: string | null;
  availableFields: SalesforceField[];
  onDeploy: (selectedIds: string[], mappings: FieldMapping[]) => void;
  onBack: () => void;
}

export default function ScanResultsStep({
  scanning,
  scanResult,
  scanError,
  availableFields,
  onDeploy,
  onBack,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mappings, setMappings] = useState<MappingEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Populate once scan result arrives (useState initializers don't re-run after mount)
  useEffect(() => {
    if (!scanResult) return;
    setSelectedIds(new Set(scanResult.affectedReports.map((r) => r.reportId)));
    setMappings(
      scanResult.foundOldFields.map((apiName) => ({
        id: _nextId++,
        oldField:
          availableFields.find((f) => f.apiName.toUpperCase() === apiName.toUpperCase()) ??
          ({ apiName, label: apiName, type: 'string', referenceTo: [] } as SalesforceField),
        newField: null,
        mode: 'replace' as FieldMappingMode,
      })),
    );
  }, [scanResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scanning state ────────────────────────────────────────────────────────────
  if (scanning) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
          <svg className="animate-spin h-8 w-8 text-sf-blue" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-sf-neutral-100 mb-2">Finding Reports…</h2>
        <p className="text-sm text-sf-neutral-70">Scanning report metadata for your selected fields.</p>
      </div>
    );
  }

  if (scanError) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
          <svg className="w-5 h-5 text-sf-red mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-sf-red">Scan failed</p>
            <p className="text-sm text-sf-neutral-70 mt-0.5">{scanError}</p>
          </div>
        </div>
        <button onClick={onBack} className="text-sm text-sf-blue hover:text-sf-blue-dark font-medium">
          ← Back to configuration
        </button>
      </div>
    );
  }

  if (!scanResult) return null;

  const reports = scanResult.affectedReports;
  const allSelected = reports.length > 0 && reports.every((r) => selectedIds.has(r.reportId));
  const someSelected = reports.some((r) => selectedIds.has(r.reportId));
  const hasIncompleteMappings = mappings.some((m) => !m.oldField || !m.newField);
  const canDeploy = selectedIds.size > 0 && mappings.length > 0 && !hasIncompleteMappings;

  const deployDisabledReason =
    selectedIds.size === 0
      ? 'Select at least one report'
      : mappings.length === 0
      ? 'Add at least one field mapping above'
      : hasIncompleteMappings
      ? 'Complete all field mappings above'
      : '';

  function addMapping() {
    setMappings((prev) => [...prev, { id: _nextId++, oldField: null, newField: null, mode: 'replace' }]);
  }

  function removeMapping(id: number) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(id: number, patch: Partial<Omit<MappingEntry, 'id'>>) {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(reports.map((r) => r.reportId)));
  }

  function toggleReport(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDeploy() {
    const fieldMappings: FieldMapping[] = mappings
      .filter((m) => m.oldField && m.newField)
      .map((m) => ({ oldField: m.oldField!.apiName, newField: m.newField!.apiName, mode: m.mode }));
    onDeploy(Array.from(selectedIds), fieldMappings);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-sf-neutral-100">Reports Found</h2>
          <p className="text-sm text-sf-neutral-70 mt-1">
            Scanned <strong>{scanResult.totalScanned}</strong> reports —{' '}
            <strong className="text-sf-blue">{scanResult.totalAffected}</strong> match your criteria
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-sf-neutral-70 hover:text-sf-blue font-medium transition shrink-0 mt-1"
        >
          ← Reconfigure
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 border border-sf-neutral-30 rounded-xl bg-sf-neutral-10">
          <svg className="mx-auto w-10 h-10 text-sf-green mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="font-medium text-sf-neutral-90">No reports match your criteria</p>
          <p className="text-sm text-sf-neutral-70 mt-1">Nothing to update.</p>
        </div>
      ) : (
        <>
          {/* ── Field Mappings ──────────────────────────────────────────────── */}
          <section className="border border-sf-neutral-30 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-sf-neutral-10 border-b border-sf-neutral-30">
              <div>
                <h3 className="text-sm font-semibold text-sf-neutral-90">Field Mappings</h3>
                <p className="text-xs text-sf-neutral-70 mt-0.5">
                  Define which fields to replace or add across the selected reports.
                </p>
              </div>
              <button
                type="button"
                onClick={addMapping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sf-blue
                           border border-sf-blue rounded-lg hover:bg-blue-50 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Mapping
              </button>
            </div>

            {mappings.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sf-neutral-20 mb-3">
                  <svg className="w-5 h-5 text-sf-neutral-50" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-sf-neutral-70">No mappings yet</p>
                <p className="text-xs text-sf-neutral-50 mt-1">
                  Click <strong>Add Mapping</strong> to define a field replacement or addition.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-sf-neutral-20">
                {mappings.map((entry) => (
                  <MappingRow
                    key={entry.id}
                    entry={entry}
                    availableFields={availableFields}
                    onUpdate={(patch) => updateMapping(entry.id, patch)}
                    onRemove={() => removeMapping(entry.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Reports list ────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between px-4 py-3 bg-sf-neutral-10 border border-sf-neutral-30 rounded-t-xl">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue"
                />
                <span className="text-sm font-medium text-sf-neutral-90">
                  {selectedIds.size} of {reports.length} reports selected
                </span>
              </label>
              <button
                disabled={!canDeploy}
                onClick={handleDeploy}
                title={deployDisabledReason}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-sf-blue hover:bg-sf-blue-dark
                           disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Deploy ({selectedIds.size})
              </button>
            </div>

            {/* Inline hint when deploy is blocked */}
            {deployDisabledReason && selectedIds.size > 0 && (
              <div className="px-4 py-2 bg-amber-50 border-x border-sf-neutral-30 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {deployDisabledReason}
              </div>
            )}

            <div className="border border-t-0 border-sf-neutral-30 rounded-b-xl divide-y divide-sf-neutral-20">
              {reports.map((report) => (
                <ReportRow
                  key={report.reportId}
                  report={report}
                  selected={selectedIds.has(report.reportId)}
                  expanded={expandedId === report.reportId}
                  onToggle={() => toggleReport(report.reportId)}
                  onExpand={() =>
                    setExpandedId((p) => (p === report.reportId ? null : report.reportId))
                  }
                />
              ))}
            </div>
          </section>

          {/* Scan errors */}
          {scanResult.errors.length > 0 && (
            <details className="border border-amber-200 rounded-xl overflow-hidden">
              <summary className="px-4 py-3 bg-amber-50 text-sm font-medium text-sf-neutral-90 cursor-pointer">
                {scanResult.errors.length} report(s) could not be scanned
              </summary>
              <ul className="divide-y divide-sf-neutral-20">
                {scanResult.errors.map((e) => (
                  <li key={e.reportId} className="px-4 py-2.5 text-xs text-sf-neutral-70">
                    <span className="font-medium text-sf-neutral-90">{e.reportName}</span>
                    {' — '}
                    <span className="text-sf-red">{e.error}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ── FieldPicker ────────────────────────────────────────────────────────────────

function FieldPicker({
  value,
  availableFields,
  exclude,
  placeholder,
  onChange,
}: {
  value: SalesforceField | null;
  availableFields: SalesforceField[];
  exclude?: string;
  placeholder: string;
  onChange: (f: SalesforceField) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      availableFields.filter(
        (f) =>
          f.apiName !== exclude &&
          (f.label.toLowerCase().includes(search.toLowerCase()) ||
            f.apiName.toLowerCase().includes(search.toLowerCase())),
      ),
    [availableFields, search, exclude],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition
          ${value
            ? 'border-sf-neutral-50 bg-white text-sf-neutral-100'
            : 'border-sf-neutral-30 bg-white text-sf-neutral-50 hover:border-sf-neutral-70'
          }`}
      >
        {value ? (
          <span className="min-w-0 flex flex-col">
            <span className="font-medium text-sf-neutral-100 truncate text-xs">{value.label}</span>
            <span className="font-mono text-xs text-sf-neutral-70 truncate">{value.apiName}</span>
          </span>
        ) : (
          <span className="text-sf-neutral-50 text-sm">{placeholder}</span>
        )}
        <svg
          className={`w-4 h-4 text-sf-neutral-50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => { setOpen(false); setSearch(''); }}
          />
          <div className="absolute z-20 mt-1 w-full min-w-[260px] bg-white border border-sf-neutral-30 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-sf-neutral-30">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-sf-neutral-30 focus:outline-none focus:ring-2 focus:ring-sf-blue"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto divide-y divide-sf-neutral-20">
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-sm text-sf-neutral-50 text-center">No matches</li>
              )}
              {filtered.map((f) => (
                <li key={f.apiName}>
                  <button
                    type="button"
                    onClick={() => { onChange(f); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-sf-neutral-10 transition flex items-center justify-between gap-2
                      ${value?.apiName === f.apiName ? 'bg-blue-50' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-sf-neutral-100 truncate">{f.label}</span>
                      <span className="block text-xs font-mono text-sf-neutral-70 truncate">{f.apiName}</span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-xs font-medium
                        ${f.type === 'reference' ? 'bg-purple-100 text-purple-700' : 'bg-sf-neutral-20 text-sf-neutral-70'}`}
                    >
                      {f.type === 'reference' && f.referenceTo.length > 0
                        ? `→ ${f.referenceTo[0]}`
                        : f.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ── MappingRow ─────────────────────────────────────────────────────────────────

function MappingRow({
  entry,
  availableFields,
  onUpdate,
  onRemove,
}: {
  entry: MappingEntry;
  availableFields: SalesforceField[];
  onUpdate: (patch: Partial<Omit<MappingEntry, 'id'>>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="px-4 py-4 bg-white">
      <div className="border border-sf-neutral-30 rounded-xl overflow-hidden">

        {/* From */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-sf-neutral-60 uppercase tracking-wide mb-2">
            Replace this field
          </p>
          <FieldPicker
            value={entry.oldField}
            availableFields={availableFields}
            exclude={entry.newField?.apiName}
            placeholder="Select field to replace…"
            onChange={(f) => onUpdate({ oldField: f })}
          />
        </div>

        {/* Arrow divider */}
        <div className="flex items-center gap-3 px-4 py-1 bg-sf-neutral-10 border-y border-sf-neutral-30">
          <div className="flex-1 h-px bg-sf-neutral-30" />
          <svg className="w-4 h-4 text-sf-neutral-50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 h-px bg-sf-neutral-30" />
        </div>

        {/* To */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-xs font-semibold text-sf-neutral-60 uppercase tracking-wide mb-2">
            With this field
          </p>
          <FieldPicker
            value={entry.newField}
            availableFields={availableFields}
            exclude={entry.oldField?.apiName}
            placeholder="Select new field…"
            onChange={(f) => onUpdate({ newField: f })}
          />
        </div>

        {/* Footer: action + remove */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-sf-neutral-10 border-t border-sf-neutral-30">
          <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden text-xs bg-white">
            <button
              type="button"
              onClick={() => onUpdate({ mode: 'replace' })}
              title="Remove the old field and put the new field in its place"
              className={`px-3 py-1.5 font-medium transition ${
                entry.mode === 'replace'
                  ? 'bg-sf-blue text-white'
                  : 'text-sf-neutral-70 hover:bg-sf-neutral-10'
              }`}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ mode: 'keep-both' })}
              title="Keep the old field and insert the new field alongside it"
              className={`px-3 py-1.5 font-medium transition border-l border-sf-neutral-30 ${
                entry.mode === 'keep-both'
                  ? 'bg-sf-blue text-white'
                  : 'text-sf-neutral-70 hover:bg-sf-neutral-10'
              }`}
            >
              + Add Alongside
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-sf-neutral-50 hover:text-sf-red transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReportRow ──────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  selected,
  expanded,
  onToggle,
  onExpand,
}: {
  report: AffectedReport;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <div className={`transition-colors ${selected ? 'bg-blue-50/40' : 'bg-white hover:bg-sf-neutral-10'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sf-neutral-100 text-sm truncate">{report.reportName}</span>
            {report.foundFields.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-sf-blue shrink-0">
                {report.foundFields.length} field{report.foundFields.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {report.folderName && (
              <span className="text-xs text-sf-neutral-70 truncate">{report.folderName}</span>
            )}
            {report.reportObjectType && (
              <span className="text-xs font-mono text-sf-neutral-50">{report.reportObjectType}</span>
            )}
          </div>
        </div>
        {report.foundFields.length > 0 && (
          <button
            onClick={onExpand}
            className="text-xs text-sf-blue hover:text-sf-blue-dark font-medium shrink-0 transition"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>
      {expanded && report.foundFields.length > 0 && (
        <div className="px-12 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {report.foundFields.map((f) => (
              <span
                key={f}
                className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 border border-red-200 text-xs font-mono text-sf-neutral-90"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
