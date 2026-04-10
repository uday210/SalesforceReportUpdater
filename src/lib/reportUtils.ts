import type { ReportMetadata } from './salesforceClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldMappingMode = 'replace' | 'keep-both';

export interface FieldMapping {
  oldField: string;
  newField: string;
  mode: FieldMappingMode;
}

export type ChangeLocation = 'column' | 'filter' | 'groupingDown' | 'groupingAcross';

export interface FieldChange {
  location: ChangeLocation;
  index: number;
  oldValue: string;
  newValue: string;
  changeType: 'replace' | 'insert';
}

/** Result of the scan phase — which old fields appear in a report, no replacements yet */
export interface AffectedReport {
  reportId: string;
  reportName: string;
  folderName?: string;
  reportObjectType: string;
  /** Which of the searched old fields actually appear in this report */
  foundFields: string[];
  originalMetadata: ReportMetadata;
}

/** Result of the apply phase — what changed and the updated metadata */
export interface ReportAnalysis {
  reportId: string;
  reportName: string;
  folderName?: string;
  reportObjectType: string;
  hasChanges: boolean;
  changes: FieldChange[];
  originalMetadata: ReportMetadata;
  updatedMetadata: ReportMetadata | null;
}

// ── Field matching helpers ─────────────────────────────────────────────────────

export function fieldMatches(fieldInReport: string, searchField: string): boolean {
  const upperReport = fieldInReport.toUpperCase();
  const upperSearch = searchField.toUpperCase();
  if (upperReport === upperSearch) return true;
  if (upperReport.endsWith('.' + upperSearch)) return true;
  return false;
}

function replaceField(fieldInReport: string, oldField: string, newField: string): string {
  const upperReport = fieldInReport.toUpperCase();
  const upperOld = oldField.toUpperCase();
  if (upperReport === upperOld) return newField;
  const suffix = '.' + upperOld;
  if (upperReport.endsWith(suffix)) {
    return fieldInReport.slice(0, fieldInReport.length - suffix.length) + '.' + newField;
  }
  return fieldInReport;
}

// ── Scan phase: detect which old fields appear in a report ────────────────────

export function findFieldsInReport(
  metadata: ReportMetadata,
  oldFieldNames: string[],
): string[] {
  const allFieldPaths = [
    ...(metadata.detailColumns ?? []),
    ...(metadata.groupingsDown ?? []).map((g) => g.name),
    ...(metadata.groupingsAcross ?? []).map((g) => g.name),
    ...(metadata.reportFilters ?? []).map((f) => f.column),
  ];

  const found = new Set<string>();
  for (const oldField of oldFieldNames) {
    if (allFieldPaths.some((path) => fieldMatches(path, oldField))) {
      found.add(oldField);
    }
  }
  return Array.from(found);
}

// ── Apply phase: compute changes and produce updated metadata ─────────────────

export function analyzeReport(
  reportId: string,
  reportName: string,
  folderName: string | undefined,
  metadata: ReportMetadata,
  fieldMappings: FieldMapping[],
): ReportAnalysis {
  const changes: FieldChange[] = [];
  const updated: ReportMetadata = JSON.parse(JSON.stringify(metadata));

  for (const mapping of fieldMappings) {
    if (!mapping.newField.trim()) continue;
    // For keep-both with no oldField, just append the new field to columns
    if (!mapping.oldField.trim() && mapping.mode === 'keep-both') {
      if (!updated.detailColumns) updated.detailColumns = [];
      if (!updated.detailColumns.some((col) => fieldMatches(col, mapping.newField))) {
        updated.detailColumns.push(mapping.newField);
        changes.push({
          location: 'column',
          index: updated.detailColumns.length - 1,
          oldValue: '',
          newValue: mapping.newField,
          changeType: 'insert',
        });
      }
      continue;
    }
    if (!mapping.oldField.trim()) continue;
    const isKeepBoth = mapping.mode === 'keep-both';

    // 1. Detail columns
    const colMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];
    (updated.detailColumns ?? []).forEach((col, idx) => {
      if (fieldMatches(col, mapping.oldField)) {
        colMatches.push({ idx, oldVal: col, newVal: replaceField(col, mapping.oldField, mapping.newField) });
      }
    });
    if (isKeepBoth) {
      [...colMatches].reverse().forEach(({ idx, oldVal, newVal }) => {
        updated.detailColumns.splice(idx + 1, 0, newVal);
        changes.push({ location: 'column', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'insert' });
      });
    } else {
      colMatches.forEach(({ idx, oldVal, newVal }) => {
        updated.detailColumns[idx] = newVal;
        changes.push({ location: 'column', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'replace' });
      });
    }

    // 2. Groupings down
    const gdMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];
    (updated.groupingsDown ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        gdMatches.push({ idx, oldVal: g.name, newVal: replaceField(g.name, mapping.oldField, mapping.newField) });
      }
    });
    if (isKeepBoth) {
      [...gdMatches].reverse().forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsDown.splice(idx + 1, 0, { ...updated.groupingsDown[idx], name: newVal });
        changes.push({ location: 'groupingDown', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'insert' });
      });
    } else {
      gdMatches.forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsDown[idx].name = newVal;
        changes.push({ location: 'groupingDown', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'replace' });
      });
    }

    // 3. Groupings across
    const gaMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];
    (updated.groupingsAcross ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        gaMatches.push({ idx, oldVal: g.name, newVal: replaceField(g.name, mapping.oldField, mapping.newField) });
      }
    });
    if (isKeepBoth) {
      [...gaMatches].reverse().forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsAcross.splice(idx + 1, 0, { ...updated.groupingsAcross[idx], name: newVal });
        changes.push({ location: 'groupingAcross', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'insert' });
      });
    } else {
      gaMatches.forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsAcross[idx].name = newVal;
        changes.push({ location: 'groupingAcross', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'replace' });
      });
    }

    // 4. Filters — always replace
    (updated.reportFilters ?? []).forEach((f, idx) => {
      if (fieldMatches(f.column, mapping.oldField)) {
        const newVal = replaceField(f.column, mapping.oldField, mapping.newField);
        updated.reportFilters[idx].column = newVal;
        changes.push({ location: 'filter', index: idx, oldValue: f.column, newValue: newVal, changeType: 'replace' });
      }
    });
  }

  return {
    reportId,
    reportName,
    folderName,
    reportObjectType: metadata.reportType?.type ?? '',
    hasChanges: changes.length > 0,
    changes,
    originalMetadata: metadata,
    updatedMetadata: changes.length > 0 ? updated : null,
  };
}

export const LOCATION_LABELS: Record<ChangeLocation, string> = {
  column: 'Column',
  filter: 'Filter',
  groupingDown: 'Row Grouping',
  groupingAcross: 'Column Grouping',
};
