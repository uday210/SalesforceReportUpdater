public with sharing class ReportUtils {

    public class FieldMapping {
        @AuraEnabled public String oldField;
        @AuraEnabled public String newField;
        @AuraEnabled public String mode; // 'replace' or 'keep-both'
    }

    // Build a JSON string from Reports.ReportMetadata using getter methods.
    // JSON.serialize(Reports.ReportMetadata) returns {} because the class has private
    // fields, so we construct the map manually.
    public static String serializeMeta(Reports.ReportMetadata meta) {
        List<Object> gd = new List<Object>();
        if (meta.getGroupingsDown() != null) {
            for (Reports.GroupingInfo g : meta.getGroupingsDown()) {
                gd.add(new Map<String, Object>{
                    'name'            => g.getName(),
                    'dateGranularity' => String.valueOf(g.getDateGranularity())
                });
            }
        }
        List<Object> ga = new List<Object>();
        if (meta.getGroupingsAcross() != null) {
            for (Reports.GroupingInfo g : meta.getGroupingsAcross()) {
                ga.add(new Map<String, Object>{
                    'name'            => g.getName(),
                    'dateGranularity' => String.valueOf(g.getDateGranularity())
                });
            }
        }
        List<Object> filters = new List<Object>();
        if (meta.getReportFilters() != null) {
            for (Reports.ReportFilter f : meta.getReportFilters()) {
                filters.add(new Map<String, Object>{
                    'column'     => f.getColumn(),
                    'operator'   => f.getOperator(),
                    'value'      => f.getValue(),
                    'filterType' => f.getFilterType()
                });
            }
        }
        return JSON.serialize(new Map<String, Object>{
            'detailColumns'      => meta.getDetailColumns()  != null ? meta.getDetailColumns()  : new List<String>(),
            'groupingsDown'      => gd,
            'groupingsAcross'    => ga,
            'reportFilters'      => filters,
            'reportBooleanFilter'=> meta.getReportBooleanFilter(),
            'aggregates'         => meta.getAggregates() != null ? meta.getAggregates() : new List<String>()
        });
    }

    public static Boolean fieldMatches(String fieldInReport, String searchField) {
        if (fieldInReport == null || searchField == null) return false;
        String upper  = fieldInReport.toUpperCase();
        String search = searchField.toUpperCase();
        return upper == search || upper.endsWith('.' + search);
    }

    private static String replaceFieldPath(String fieldInReport, String oldField, String newField) {
        String upper    = fieldInReport.toUpperCase();
        String upperOld = oldField.toUpperCase();
        if (upper == upperOld) return newField;
        String suffix = '.' + upperOld;
        if (upper.endsWith(suffix)) {
            return fieldInReport.substring(0, fieldInReport.length() - suffix.length()) + '.' + newField;
        }
        return fieldInReport;
    }

    // Returns updated metadata JSON, or null if nothing changed.
    public static String analyzeAndUpdateMetadata(String metadataJson, List<FieldMapping> mappings) {
        Map<String, Object> updated = (Map<String, Object>) JSON.deserializeUntyped(metadataJson);
        Boolean hasChanges = false;

        for (FieldMapping m : mappings) {
            if (String.isBlank(m.newField)) continue;
            Boolean isKeepBoth = m.mode == 'keep-both';

            // Add-only: keep-both with no oldField → append new field to columns
            if (isKeepBoth && String.isBlank(m.oldField)) {
                List<Object> cols = (List<Object>) updated.get('detailColumns');
                if (cols == null) { cols = new List<Object>(); updated.put('detailColumns', cols); }
                Boolean already = false;
                for (Object c : cols) { if (fieldMatches((String)c, m.newField)) { already = true; break; } }
                if (!already) { cols.add(m.newField); hasChanges = true; }
                continue;
            }

            if (String.isBlank(m.oldField)) continue;

            // 1. Detail columns
            List<Object> cols = (List<Object>) updated.get('detailColumns');
            if (cols != null) {
                if (isKeepBoth) {
                    List<Object> next = new List<Object>();
                    for (Object c : cols) {
                        next.add(c);
                        if (fieldMatches((String)c, m.oldField)) {
                            next.add(replaceFieldPath((String)c, m.oldField, m.newField));
                            hasChanges = true;
                        }
                    }
                    updated.put('detailColumns', next);
                } else {
                    for (Integer i = 0; i < cols.size(); i++) {
                        if (fieldMatches((String)cols[i], m.oldField)) {
                            cols[i] = replaceFieldPath((String)cols[i], m.oldField, m.newField);
                            hasChanges = true;
                        }
                    }
                }
            }

            // 2. Groupings down
            List<Object> gd = (List<Object>) updated.get('groupingsDown');
            if (gd != null) {
                if (isKeepBoth) {
                    List<Object> next = new List<Object>();
                    for (Object g : gd) {
                        next.add(g);
                        Map<String,Object> gm = (Map<String,Object>) g;
                        String name = (String) gm.get('name');
                        if (fieldMatches(name, m.oldField)) {
                            Map<String,Object> newG = gm.clone();
                            newG.put('name', replaceFieldPath(name, m.oldField, m.newField));
                            next.add(newG); hasChanges = true;
                        }
                    }
                    updated.put('groupingsDown', next);
                } else {
                    for (Object g : gd) {
                        Map<String,Object> gm = (Map<String,Object>) g;
                        String name = (String) gm.get('name');
                        if (fieldMatches(name, m.oldField)) {
                            gm.put('name', replaceFieldPath(name, m.oldField, m.newField));
                            hasChanges = true;
                        }
                    }
                }
            }

            // 3. Groupings across
            List<Object> ga = (List<Object>) updated.get('groupingsAcross');
            if (ga != null) {
                if (isKeepBoth) {
                    List<Object> next = new List<Object>();
                    for (Object g : ga) {
                        next.add(g);
                        Map<String,Object> gm = (Map<String,Object>) g;
                        String name = (String) gm.get('name');
                        if (fieldMatches(name, m.oldField)) {
                            Map<String,Object> newG = gm.clone();
                            newG.put('name', replaceFieldPath(name, m.oldField, m.newField));
                            next.add(newG); hasChanges = true;
                        }
                    }
                    updated.put('groupingsAcross', next);
                } else {
                    for (Object g : ga) {
                        Map<String,Object> gm = (Map<String,Object>) g;
                        String name = (String) gm.get('name');
                        if (fieldMatches(name, m.oldField)) {
                            gm.put('name', replaceFieldPath(name, m.oldField, m.newField));
                            hasChanges = true;
                        }
                    }
                }
            }

            // 4. Filters — always replace
            List<Object> filters = (List<Object>) updated.get('reportFilters');
            if (filters != null) {
                for (Object f : filters) {
                    Map<String,Object> fm = (Map<String,Object>) f;
                    String col = (String) fm.get('column');
                    if (fieldMatches(col, m.oldField)) {
                        fm.put('column', replaceFieldPath(col, m.oldField, m.newField));
                        hasChanges = true;
                    }
                }
            }
        }

        return hasChanges ? JSON.serialize(updated) : null;
    }
}
