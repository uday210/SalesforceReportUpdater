'use client';

import { useState, useMemo } from 'react';
import type { AffectedReport, FieldMapping, FieldMappingMode } from '@/lib/reportUtils';
import type { ScanResponseBody } from '@/app/api/reports/scan/route';
import type { SalesforceField } from '@/lib/salesforceClient';

interface MappingRow {
  oldField: string;
  newField: SalesforceField | null;
  mode: FieldMappingMode;
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(scanResult?.affectedReports.map((r) => r.reportId) ?? []),
  );
  const [mappings, setMappings] = useState<MappingRow[]>(() =>
    (scanResult?.foundOldFields ?? []).map((f) => ({ oldField: f, newField: null, mode: 'replace' })),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Scanning state ──────────────────────────────────────────────────────────
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
  const validMappings = mappings.filter((m) => m.newField !== null);
  const canDeploy = selectedIds.size > 0 && validMappings.length > 0;

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(reports.map((r) => r.reportId)));
  }

  function toggleReport(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function updateMapping(oldField: string, patch: Partial<Omit<MappingRow, 'oldField'>>) {
    setMappings((prev) => prev.map((m) => (m.oldField === oldField ? { ...m, ...patch } : m)));
  }

  function handleDeploy() {
    const fieldMappings: FieldMapping[] = validMappings.map((m) => ({
      oldField: m.oldField,
      newField: m.newField!.apiName,
      mode: m.mode,
    }));
    onDeploy(Array.from(selectedIds), fieldMappings);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-7">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-sf-neutral-100">Reports Found</h2>
          <p className="text-sm text-sf-neutral-70 mt-1">
            Scanned <strong>{scanResult.totalScanned}</strong> reports — <strong className="text-sf-blue">{scanResult.totalAffected}</strong> reference your selected fields
          </p>
        </div>
        <button onClick={onBack} className="text-sm text-sf-neutral-70 hover:text-sf-blue font-medium transition">
          ← Reconfigure
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 border border-sf-neutral-30 rounded-xl bg-sf-neutral-10">
          <svg className="mx-auto w-10 h-10 text-sf-green mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="font-medium text-sf-neutral-90">No reports reference those fields</p>
        </div>
      ) : (
        <>
          {/* ── Step 1: Field Mappings ──────────────────────────────────── */}
          <section className="border border-sf-neutral-30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-sf-neutral-10 border-b border-sf-neutral-30">
              <h3 className="text-sm font-semibold text-sf-neutral-90">
                Step 1 — Set up Field Mappings
              </h3>
              <p className="text-xs text-sf-neutral-70 mt-0.5">
                For each found field, choose what to replace it with and how.
              </p>
            </div>
            <div className="divide-y divide-sf-neutral-20">
              {mappings.map((row) => (
                <MappingRow
                  key={row.oldField}
                  row={row}
                  availableFields={availableFields}
                  onChange={(patch) => updateMapping(row.oldField, patch)}
                />
              ))}
            </div>
          </section>

          {/* ── Step 2: Select Reports ──────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between py-3 px-4 bg-sf-neutral-10 border border-sf-neutral-30 rounded-t-xl">
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
                className="px-4 py-1.5 text-sm font-semibold bg-sf-blue hover:bg-sf-blue-dark
                           disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition"
                title={!canDeploy ? (selectedIds.size === 0 ? 'Select at least one report' : 'Complete all field mappings first') : ''}
              >
                Deploy ({selectedIds.size})
              </button>
            </div>

            <div className="border border-t-0 border-sf-neutral-30 rounded-b-xl divide-y divide-sf-neutral-30">
              {reports.map((report) => (
                <ReportRow
                  key={report.reportId}
                  report={report}
                  selected={selectedIds.has(report.reportId)}
                  expanded={expandedId === report.reportId}
                  onToggle={() => toggleReport(report.reportId)}
                  onExpand={() => setExpandedId((p) => p === report.reportId ? null : report.reportId)}
                />
              ))}
            </div>
          </section>

          {/* Mapping incomplete warning */}
          {selectedIds.size > 0 && validMappings.length < mappings.length && (
            <p className="text-xs text-sf-yellow font-medium text-center">
              Complete all field mappings above before deploying
            </p>
          )}
        </>
      )}

      {/* Scan errors */}
      {scanResult.errors.length > 0 && (
        <details className="border border-sf-yellow/50 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 bg-yellow-50 text-sm font-medium text-sf-neutral-90 cursor-pointer">
            {scanResult.errors.length} report(s) could not be scanned
          </summary>
          <ul className="divide-y divide-sf-neutral-30">
            {scanResult.errors.map((e) => (
              <li key={e.reportId} className="px-4 py-2.5 text-xs text-sf-neutral-70">
                <span className="font-medium text-sf-neutral-90">{e.reportName}</span>{' — '}
                <span className="text-sf-red">{e.error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Mapping row ────────────────────────────────────────────────────────────────

function MappingRow({
  row,
  availableFields,
  onChange,
}: {
  row: MappingRow;
  availableFields: SalesforceField[];
  onChange: (patch: Partial<Omit<MappingRow, 'oldField'>>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      availableFields.filter(
        (f) =>
          f.apiName !== row.oldField &&
          (f.label.toLowerCase().includes(search.toLowerCase()) ||
            f.apiName.toLowerCase().includes(search.toLowerCase())),
      ),
    [availableFields, search, row.oldField],
  );

  return (
    <div className="px-4 py-3 bg-white">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
        {/* Old field */}
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm font-mono text-sf-neutral-90 truncate">
          {row.oldField}
        </div>

        <svg className="w-4 h-4 text-sf-neutral-50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>

        {/* New field picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left transition
              ${row.newField ? 'border-sf-blue bg-green-50 text-sf-neutral-100' : 'border-sf-neutral-30 bg-white text-sf-neutral-50 hover:border-sf-neutral-50'}`}
          >
            <span className="truncate min-w-0">
              {row.newField ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{row.newField.label}</span>
                  <span className="font-mono text-xs text-sf-neutral-70 truncate">{row.newField.apiName}</span>
                </span>
              ) : 'Select new field…'}
            </span>
            <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(''); }} />
              <div className="absolute z-20 mt-1 w-full min-w-[260px] bg-white border border-sf-neutral-30 rounded-xl shadow-lg overflow-hidden">
                <div className="p-2 border-b border-sf-neutral-30">
                  <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search fields…"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-sf-neutral-30 focus:outline-none focus:ring-2 focus:ring-sf-blue" />
                </div>
                <ul className="max-h-48 overflow-y-auto divide-y divide-sf-neutral-20">
                  {filtered.length === 0 && <li className="px-3 py-4 text-sm text-sf-neutral-50 text-center">No matches</li>}
                  {filtered.map((f) => (
                    <li key={f.apiName}>
                      <button type="button"
                        onClick={() => { onChange({ newField: f }); setOpen(false); setSearch(''); }}
                        className={`w-full text-left px-3 py-2 hover:bg-sf-neutral-10 transition flex items-center justify-between gap-2 ${row.newField?.apiName === f.apiName ? 'bg-blue-50' : ''}`}>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-sf-neutral-100 truncate">{f.label}</span>
                          <span className="block text-xs font-mono text-sf-neutral-70 truncate">{f.apiName}</span>
                        </span>
                        <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-xs font-medium ${f.type === 'reference' ? 'bg-purple-100 text-purple-700' : 'bg-sf-neutral-20 text-sf-neutral-70'}`}>
                          {f.type === 'reference' && f.referenceTo.length > 0 ? `→ ${f.referenceTo[0]}` : f.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden text-xs">
          <button type="button" onClick={() => onChange({ mode: 'replace' })}
            className={`px-2.5 py-2 font-medium transition ${row.mode === 'replace' ? 'bg-sf-blue text-white' : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'}`}
            title="Replace old field with new field">
            Replace
          </button>
          <button type="button" onClick={() => onChange({ mode: 'keep-both' })}
            className={`px-2.5 py-2 font-medium transition border-l border-sf-neutral-30 ${row.mode === 'keep-both' ? 'bg-sf-blue text-white' : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'}`}
            title="Keep old field and add new field alongside">
            Keep Both
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report row ─────────────────────────────────────────────────────────────────

function ReportRow({ report, selected, expanded, onToggle, onExpand }: {
  report: AffectedReport;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <div className={`transition-colors ${selected ? 'bg-blue-50/40' : 'bg-white hover:bg-sf-neutral-10'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input type="checkbox" checked={selected} onChange={onToggle}
          className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sf-neutral-100 text-sm truncate">{report.reportName}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-sf-blue shrink-0">
              {report.foundFields.length} field{report.foundFields.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {report.folderName && <span className="text-xs text-sf-neutral-70 truncate">{report.folderName}</span>}
            {report.reportObjectType && <span className="text-xs font-mono text-sf-neutral-50">{report.reportObjectType}</span>}
          </div>
        </div>
        <button onClick={onExpand} className="text-xs text-sf-blue hover:text-sf-blue-dark font-medium shrink-0 transition">
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {expanded && (
        <div className="px-12 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {report.foundFields.map((f) => (
              <span key={f} className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 border border-red-200 text-xs font-mono text-sf-neutral-90">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
