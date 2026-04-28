public with sharing class ReportScanController {

    @AuraEnabled
    public static ScanResult scanReports(String objectType, List<String> oldFieldNames) {
        if (String.isBlank(objectType)) {
            throw new AuraHandledException('objectType is required');
        }

        Boolean scanAllFields = (oldFieldNames == null || oldFieldNames.isEmpty());

        // Standard SOQL on Report does not support ReportType relationship traversal.
        // Query all reports and filter by type inside the describe loop.
        List<Report> allReports = [
            SELECT Id, Name, FolderName
            FROM   Report
            ORDER BY LastModifiedDate DESC NULLS LAST
            LIMIT  200
        ];

        List<AffectedReport> affectedReports = new List<AffectedReport>();
        List<ScanError>      errors          = new List<ScanError>();
        Set<String>          foundFieldsSet  = new Set<String>();
        Integer              totalScanned    = 0;

        for (Report r : allReports) {
            try {
                Reports.ReportDescribeResult dr   = Reports.ReportManager.describeReport(r.Id);
                Reports.ReportMetadata       meta = dr.getReportMetadata();

                // Filter by object / report-type API name
                String rptType = meta.getReportType() != null
                    ? meta.getReportType().getType()
                    : '';
                if (!rptType.equalsIgnoreCase(objectType)) continue;

                totalScanned++;

                List<String> allPaths    = collectPaths(meta);
                List<String> foundFields = scanAllFields
                    ? new List<String>()
                    : findMatches(allPaths, oldFieldNames);

                if (!scanAllFields && foundFields.isEmpty()) continue;
                for (String f : foundFields) foundFieldsSet.add(f);

                affectedReports.add(new AffectedReport(
                    r.Id, r.Name,
                    r.FolderName != null ? r.FolderName : '',
                    rptType, foundFields,
                    serializeMeta(meta)
                ));
            } catch (Exception e) {
                errors.add(new ScanError(r.Id, r.Name, e.getMessage()));
            }
        }

        ScanResult result      = new ScanResult();
        result.totalScanned    = totalScanned;
        result.totalAffected   = affectedReports.size();
        result.affectedReports = affectedReports;
        result.foundOldFields  = new List<String>(foundFieldsSet);
        result.errors          = errors;
        return result;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    // JSON.serialize(Reports.ReportMetadata) returns {} because the class has private
    // fields. Build the JSON manually from getter methods instead.
    private static String serializeMeta(Reports.ReportMetadata meta) {
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
        Map<String, Object> m = new Map<String, Object>{
            'detailColumns'  => meta.getDetailColumns()  != null ? meta.getDetailColumns()  : new List<String>(),
            'groupingsDown'  => gd,
            'groupingsAcross'=> ga,
            'reportFilters'  => filters
        };
        return JSON.serialize(m);
    }

    private static List<String> collectPaths(Reports.ReportMetadata meta) {
        List<String> paths = new List<String>();
        if (meta.getDetailColumns() != null)  paths.addAll(meta.getDetailColumns());
        if (meta.getGroupingsDown() != null) {
            for (Reports.GroupingInfo g : meta.getGroupingsDown())
                if (g.getName() != null) paths.add(g.getName());
        }
        if (meta.getGroupingsAcross() != null) {
            for (Reports.GroupingInfo g : meta.getGroupingsAcross())
                if (g.getName() != null) paths.add(g.getName());
        }
        if (meta.getReportFilters() != null) {
            for (Reports.ReportFilter f : meta.getReportFilters())
                if (f.getColumn() != null) paths.add(f.getColumn());
        }
        return paths;
    }

    private static List<String> findMatches(List<String> paths, List<String> targets) {
        Set<String> found = new Set<String>();
        for (String t : targets) {
            for (String p : paths) {
                if (p != null && ReportUtils.fieldMatches(p, t)) { found.add(t); break; }
            }
        }
        return new List<String>(found);
    }

    // ── Inner classes ──────────────────────────────────────────────────────────

    public class ScanResult {
        @AuraEnabled public Integer              totalScanned;
        @AuraEnabled public Integer              totalAffected;
        @AuraEnabled public List<AffectedReport> affectedReports;
        @AuraEnabled public List<String>         foundOldFields;
        @AuraEnabled public List<ScanError>      errors;
    }

    public class AffectedReport {
        @AuraEnabled public String       reportId;
        @AuraEnabled public String       reportName;
        @AuraEnabled public String       folderName;
        @AuraEnabled public String       reportObjectType;
        @AuraEnabled public List<String> foundFields;
        @AuraEnabled public String       originalMetadataJson;

        public AffectedReport(String id, String name, String folder, String type,
                               List<String> fields, String metaJson) {
            reportId             = id;
            reportName           = name;
            folderName           = folder;
            reportObjectType     = type;
            foundFields          = fields;
            originalMetadataJson = metaJson;
        }
    }

    public class ScanError {
        @AuraEnabled public String reportId;
        @AuraEnabled public String reportName;
        @AuraEnabled public String error;
        public ScanError(String i, String n, String e) { reportId = i; reportName = n; error = e; }
    }
}
