import type { ReportMetadata } from './salesforceClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FieldMapping {
  oldField: string;
  newField: string;
}

export type ChangeLocation = 'column' | 'filter' | 'groupingDown' | 'groupingAcross';

export interface FieldChange {
  location: ChangeLocation;
  index: number;
  oldValue: string;
  newValue: string;
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

  // Match when the report field ends with ".<searchField>"
  if (upperReport.endsWith('.' + upperSearch)) return true;

  return false;
}

/**
 * Replaces the matching segment in `fieldInReport` with `newField`, preserving any prefix.
 *
 * Examples:
 *   replaceField("OPPORTUNITY.OLD_LOOKUP__C", "OLD_LOOKUP__C", "NEW_LOOKUP__C")
 *   → "OPPORTUNITY.NEW_LOOKUP__C"
 *
 *   replaceField("OLD_LOOKUP__C", "OLD_LOOKUP__C", "NEW_LOOKUP__C")
 *   → "NEW_LOOKUP__C"
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

// ── Core analysis ──────────────────────────────────────────────────────────────

/**
 * Analyses a single report's metadata against the provided field mappings.
 * Returns which fields need to change, and the already-patched metadata if any
 * changes were found.
 */
export function analyzeReport(
  reportId: string,
  reportName: string,
  folderName: string | undefined,
  metadata: ReportMetadata,
  fieldMappings: FieldMapping[],
): ReportAnalysis {
  const changes: FieldChange[] = [];
  // Deep-clone so we can mutate safely
  const updated: ReportMetadata = JSON.parse(JSON.stringify(metadata));

  for (const mapping of fieldMappings) {
    if (!mapping.oldField.trim() || !mapping.newField.trim()) continue;

    // 1. Detail columns
    (updated.detailColumns ?? []).forEach((col, idx) => {
      if (fieldMatches(col, mapping.oldField)) {
        const newVal = replaceField(col, mapping.oldField, mapping.newField);
        changes.push({ location: 'column', index: idx, oldValue: col, newValue: newVal });
        updated.detailColumns[idx] = newVal;
      }
    });

    // 2. Groupings (rows)
    (updated.groupingsDown ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        const newVal = replaceField(g.name, mapping.oldField, mapping.newField);
        changes.push({ location: 'groupingDown', index: idx, oldValue: g.name, newValue: newVal });
        updated.groupingsDown[idx].name = newVal;
      }
    });

    // 3. Groupings (columns/across)
    (updated.groupingsAcross ?? []).forEach((g, idx) => {
      if (fieldMatches(g.name, mapping.oldField)) {
        const newVal = replaceField(g.name, mapping.oldField, mapping.newField);
        changes.push({
          location: 'groupingAcross',
          index: idx,
          oldValue: g.name,
          newValue: newVal,
        });
        updated.groupingsAcross[idx].name = newVal;
      }
    });

    // 4. Report filters
    (updated.reportFilters ?? []).forEach((f, idx) => {
      if (fieldMatches(f.column, mapping.oldField)) {
        const newVal = replaceField(f.column, mapping.oldField, mapping.newField);
        changes.push({ location: 'filter', index: idx, oldValue: f.column, newValue: newVal });
        updated.reportFilters[idx].column = newVal;
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

// ── Helpers for UI ─────────────────────────────────────────────────────────────

export const LOCATION_LABELS: Record<ChangeLocation, string> = {
  column: 'Column',
  filter: 'Filter',
  groupingDown: 'Row Grouping',
  groupingAcross: 'Column Grouping',
};
