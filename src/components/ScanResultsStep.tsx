'use client';

import { useState } from 'react';
import type { ReportAnalysis } from '@/lib/reportUtils';
import { LOCATION_LABELS } from '@/lib/reportUtils';
import type { ScanResponseBody } from '@/app/api/reports/scan/route';

interface Props {
  scanning: boolean;
  scanProgress: { scanned: number; total: number } | null;
  scanResult: ScanResponseBody | null;
  scanError: string | null;
  onDeploy: (selectedIds: string[]) => void;
  onBack: () => void;
}

export default function ScanResultsStep({
  scanning,
  scanProgress,
  scanResult,
  scanError,
  onDeploy,
  onBack,
}: Props) {
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(scanResult?.analyses.map((a) => a.reportId) ?? []),
  );

  // Sync selectedIds when scanResult changes
  const analyses = scanResult?.analyses ?? [];
  const allSelected = analyses.length > 0 && analyses.every((a) => selectedIds.has(a.reportId));
  const someSelected = analyses.some((a) => selectedIds.has(a.reportId));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map((a) => a.reportId)));
    }
  }

  function toggleReport(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Scanning state ──────────────────────────────────────────────────────────
  if (scanning) {
    const progress = scanProgress?.total ? (scanProgress.scanned / scanProgress.total) * 100 : null;

    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
          <svg className="animate-spin h-8 w-8 text-sf-blue" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-sf-neutral-100 mb-2">Scanning Reports…</h2>
        <p className="text-sm text-sf-neutral-70 mb-6">
          Fetching report metadata and checking for field references.
        </p>
        {progress !== null && (
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-sf-neutral-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-sf-blue rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-sf-neutral-70 mt-2">
              {scanProgress!.scanned} / {scanProgress!.total} reports
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (scanError) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5">
          <svg className="w-5 h-5 text-sf-red mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-sf-red">Scan failed</p>
            <p className="text-sm text-sf-neutral-70 mt-0.5">{scanError}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mt-5 text-sm text-sf-blue hover:text-sf-blue-dark font-medium transition"
        >
          ← Back to configuration
        </button>
      </div>
    );
  }

  // ── No results yet ──────────────────────────────────────────────────────────
  if (!scanResult) return null;

  // ── Results ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-sf-neutral-100">Scan Results</h2>
          <p className="text-sm text-sf-neutral-70 mt-1">
            Scanned <strong>{scanResult.totalScanned}</strong> reports &mdash; found{' '}
            <strong className={scanResult.totalAffected > 0 ? 'text-sf-blue' : 'text-sf-green'}>
              {scanResult.totalAffected}
            </strong>{' '}
            with field references to update
            {scanResult.errors.length > 0 && (
              <span className="text-sf-yellow ml-2">
                ({scanResult.errors.length} scan errors)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-sf-neutral-70 hover:text-sf-blue transition font-medium"
        >
          ← Reconfigure
        </button>
      </div>

      {/* No affected reports */}
      {analyses.length === 0 && (
        <div className="text-center py-16 border border-sf-neutral-30 rounded-xl bg-sf-neutral-10">
          <svg className="mx-auto w-10 h-10 text-sf-green mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="font-medium text-sf-neutral-90">No reports need updating</p>
          <p className="text-sm text-sf-neutral-70 mt-1">
            None of the scanned reports reference the old fields.
          </p>
        </div>
      )}

      {/* Reports list */}
      {analyses.length > 0 && (
        <>
          {/* Select-all toolbar */}
          <div className="flex items-center justify-between py-3 px-4 bg-sf-neutral-10 border border-sf-neutral-30 rounded-t-xl">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue"
              />
              <span className="text-sm text-sf-neutral-90 font-medium">
                {selectedIds.size} of {analyses.length} reports selected
              </span>
            </label>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => onDeploy(Array.from(selectedIds))}
              className="px-4 py-1.5 text-sm font-semibold bg-sf-blue hover:bg-sf-blue-dark
                         disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition"
            >
              Deploy Selected ({selectedIds.size})
            </button>
          </div>

          {/* Report rows */}
          <div className="border border-t-0 border-sf-neutral-30 rounded-b-xl divide-y divide-sf-neutral-30">
            {analyses.map((analysis) => (
              <ReportRow
                key={analysis.reportId}
                analysis={analysis}
                selected={selectedIds.has(analysis.reportId)}
                expanded={expandedReportId === analysis.reportId}
                onToggleSelect={() => toggleReport(analysis.reportId)}
                onToggleExpand={() =>
                  setExpandedReportId((prev) =>
                    prev === analysis.reportId ? null : analysis.reportId,
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Scan errors (collapsible) */}
      {scanResult.errors.length > 0 && (
        <details className="mt-6 border border-sf-yellow/50 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 bg-yellow-50 text-sm font-medium text-sf-neutral-90 cursor-pointer">
            {scanResult.errors.length} report(s) could not be scanned
          </summary>
          <ul className="divide-y divide-sf-neutral-30">
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
    </div>
  );
}

// ── ReportRow sub-component ────────────────────────────────────────────────────

interface ReportRowProps {
  analysis: ReportAnalysis;
  selected: boolean;
  expanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function ReportRow({ analysis, selected, expanded, onToggleSelect, onToggleExpand }: ReportRowProps) {
  return (
    <div className={`transition-colors ${selected ? 'bg-blue-50/40' : 'bg-white hover:bg-sf-neutral-10'}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-sf-neutral-50 text-sf-blue focus:ring-sf-blue shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sf-neutral-100 text-sm truncate">
              {analysis.reportName}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-sf-blue shrink-0">
              {analysis.changes.length} change{analysis.changes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {analysis.folderName && (
              <span className="text-xs text-sf-neutral-70 truncate">
                {analysis.folderName}
              </span>
            )}
            {analysis.reportObjectType && (
              <span className="text-xs text-sf-neutral-50 font-mono">
                {analysis.reportObjectType}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          className="ml-auto text-xs text-sf-blue hover:text-sf-blue-dark font-medium shrink-0 transition"
        >
          {expanded ? 'Hide' : 'Preview'}
        </button>
      </div>

      {/* Expanded diff */}
      {expanded && (
        <div className="px-12 pb-4">
          <div className="rounded-lg border border-sf-neutral-30 overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-sf-neutral-10 text-sf-neutral-70">
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Location</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">Before</th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sf-neutral-30">
                {analysis.changes.map((change, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sf-neutral-70">
                      {LOCATION_LABELS[change.location]}
                    </td>
                    <td className="px-3 py-2 font-mono text-sf-red bg-red-50">
                      {change.oldValue}
                    </td>
                    <td className="px-3 py-2 font-mono text-sf-green bg-green-50">
                      {change.newValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
