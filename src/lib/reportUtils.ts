import type { ReportMetadata } from './salesforceClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldMappingMode = 'replace' | 'keep-both';

export interface FieldMapping {
  oldField: string;
  newField: string;
  /** replace: swap old → new. keep-both: retain old AND insert new alongside it. */
  mode: FieldMappingMode;
}

export type ChangeLocation = 'column' | 'filter' | 'groupingDown' | 'groupingAcross';

export interface FieldChange {
  location: ChangeLocation;
  /** Index of the old field in the original metadata array */
  index: number;
  oldValue: string;
  newValue: string;
  /**
   * replace — oldValue is swapped for newValue.
   * insert  — newValue is inserted right after oldValue (keep-both columns/groupings).
   *           Filters always use replace even in keep-both mode.
   */
  changeType: 'replace' | 'insert';
}

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

/**
 * Returns true when `fieldInReport` contains `searchField` as its last path segment,
 * compared case-insensitively.
 *
 * Examples:
 *   fieldMatches("OPPORTUNITY.OLD_LOOKUP__C", "OLD_LOOKUP__C")  → true
 *   fieldMatches("OLD_LOOKUP__C", "OLD_LOOKUP__C")               → true
 *   fieldMatches("ACCOUNT.NAME", "OLD_LOOKUP__C")                → false
 */
function fieldMatches(fieldInReport: string, searchField: string): boolean {
  const upperReport = fieldInReport.toUpperCase();
  const upperSearch = searchField.toUpperCase();
  if (upperReport === upperSearch) return true;
  if (upperReport.endsWith('.' + upperSearch)) return true;
  return false;
}

/**
 * Replaces the matching segment in `fieldInReport` with `newField`, preserving any prefix.
 *
 * Examples:
 *   replaceField("OPPORTUNITY.OLD_LOOKUP__C", "OLD_LOOKUP__C", "NEW_LOOKUP__C")
 *   → "OPPORTUNITY.NEW_LOOKUP__C"
 */
function replaceField(fieldInReport: string, oldField: string, newField: string): string {
  const upperReport = fieldInReport.toUpperCase();
  const upperOld = oldField.toUpperCase();
  if (upperReport === upperOld) return newField;
  const suffix = '.' + upperOld;
  if (upperReport.endsWith(suffix)) {
    const prefix = fieldInReport.slice(0, fieldInReport.length - suffix.length);
    return `${prefix}.${newField}`;
  }
  return fieldInReport;
}

/**
 * Derives the new field path by copying the object prefix from the old field path
 * and appending the new field API name.
 *
 * Examples:
 *   deriveNewPath("OPPORTUNITY.OLD_LOOKUP__C", "OLD_LOOKUP__C", "NEW_LOOKUP__C")
 *   → "OPPORTUNITY.NEW_LOOKUP__C"
 *
 *   deriveNewPath("OLD_LOOKUP__C", "OLD_LOOKUP__C", "NEW_LOOKUP__C")
 *   → "NEW_LOOKUP__C"
 */
function deriveNewPath(fieldInReport: string, oldField: string, newField: string): string {
  return replaceField(fieldInReport, oldField, newField);
}

// ── Core analysis ──────────────────────────────────────────────────────────────

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
    if (!mapping.oldField.trim() || !mapping.newField.trim()) continue;
    const isKeepBoth = mapping.mode === 'keep-both';

    // ── 1. Detail columns ────────────────────────────────────────────────────
    // Collect matches first, then apply insertions in reverse order so indices stay valid
    const colMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];

    (updated.detailColumns ?? []).forEach((col, idx) => {
      if (fieldMatches(col, mapping.oldField)) {
        colMatches.push({
          idx,
          oldVal: col,
          newVal: deriveNewPath(col, mapping.oldField, mapping.newField),
        });
      }
    });

    if (isKeepBoth) {
      // Apply insertions in reverse so index offsets don't accumulate
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

    // ── 2. Groupings (rows) ──────────────────────────────────────────────────
    const gdMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];

    (updated.groupingsDown ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        gdMatches.push({
          idx,
          oldVal: g.name,
          newVal: deriveNewPath(g.name, mapping.oldField, mapping.newField),
        });
      }
    });

    if (isKeepBoth) {
      [...gdMatches].reverse().forEach(({ idx, oldVal, newVal }) => {
        const newGrouping = { ...updated.groupingsDown[idx], name: newVal };
        updated.groupingsDown.splice(idx + 1, 0, newGrouping);
        changes.push({ location: 'groupingDown', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'insert' });
      });
    } else {
      gdMatches.forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsDown[idx].name = newVal;
        changes.push({ location: 'groupingDown', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'replace' });
      });
    }

    // ── 3. Groupings (columns/across) ────────────────────────────────────────
    const gaMatches: Array<{ idx: number; oldVal: string; newVal: string }> = [];

    (updated.groupingsAcross ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        gaMatches.push({
          idx,
          oldVal: g.name,
          newVal: deriveNewPath(g.name, mapping.oldField, mapping.newField),
        });
      }
    });

    if (isKeepBoth) {
      [...gaMatches].reverse().forEach(({ idx, oldVal, newVal }) => {
        const newGrouping = { ...updated.groupingsAcross[idx], name: newVal };
        updated.groupingsAcross.splice(idx + 1, 0, newGrouping);
        changes.push({ location: 'groupingAcross', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'insert' });
      });
    } else {
      gaMatches.forEach(({ idx, oldVal, newVal }) => {
        updated.groupingsAcross[idx].name = newVal;
        changes.push({ location: 'groupingAcross', index: idx, oldValue: oldVal, newValue: newVal, changeType: 'replace' });
      });
    }

    // ── 4. Report filters ────────────────────────────────────────────────────
    // Filters always use replace — duplicating a filter condition doesn't make sense
    (updated.reportFilters ?? []).forEach((f, idx) => {
      if (fieldMatches(f.column, mapping.oldField)) {
        const newVal = deriveNewPath(f.column, mapping.oldField, mapping.newField);
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

// ── UI helpers ─────────────────────────────────────────────────────────────────

export const LOCATION_LABELS: Record<ChangeLocation, string> = {
  column: 'Column',
  filter: 'Filter',
  groupingDown: 'Row Grouping',
  groupingAcross: 'Column Grouping',
};
