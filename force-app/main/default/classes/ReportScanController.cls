public with sharing class ReportScanController {

    @AuraEnabled
    public static ScanResult scanReports(String objectType, List<String> oldFieldNames) {
        if (String.isBlank(objectType)) {
            throw new AuraHandledException('objectType is required');
        }

        Boolean scanAllFields = (oldFieldNames == null || oldFieldNames.isEmpty());
        String sessionId   = UserInfo.getSessionId();
        String instanceUrl = URL.getOrgDomainUrl().toExternalForm();

        // Step 1: List reports for this object type via Tooling API (1 callout)
        List<ReportInfo> reports = getReportsByType(instanceUrl, sessionId, objectType);

        // Step 2: Fetch metadata for each report (1 callout per report, max 90)
        List<AffectedReport> affectedReports = new List<AffectedReport>();
        List<ScanError>      errors          = new List<ScanError>();
        Set<String>          foundFieldsSet  = new Set<String>();

        Integer callouts = 1; // already used 1 above
        for (ReportInfo ri : reports) {
            if (callouts >= 95) break; // stay within governor limit
            callouts++;
            try {
                Map<String, Object> metadata = fetchReportMetadata(instanceUrl, sessionId, ri.id);
                if (metadata == null) continue;

                List<String> foundFields = scanAllFields
                    ? new List<String>()
                    : findFieldsInReport(metadata, oldFieldNames);

                if (!scanAllFields && foundFields.isEmpty()) continue;
                for (String f : foundFields) foundFieldsSet.add(f);

                Map<String, Object> rt = (Map<String, Object>) metadata.get('reportType');
                String typeStr = rt != null ? (String) rt.get('type') : '';

                affectedReports.add(new AffectedReport(
                    ri.id, ri.name, ri.folderName, typeStr,
                    foundFields, JSON.serialize(metadata)
                ));
            } catch (Exception e) {
                errors.add(new ScanError(ri.id, ri.name, e.getMessage()));
            }
        }

        ScanResult result      = new ScanResult();
        result.totalScanned    = reports.size();
        result.totalAffected   = affectedReports.size();
        result.affectedReports = affectedReports;
        result.foundOldFields  = new List<String>(foundFieldsSet);
        result.errors          = errors;
        return result;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private static List<ReportInfo> getReportsByType(String instanceUrl, String sessionId, String objectType) {
        String soql = 'SELECT Id, Name, FolderName FROM Report WHERE ReportType.DeveloperName = \''
            + String.escapeSingleQuotes(objectType) + '\' LIMIT 90';
        String encoded = EncodingUtil.urlEncode(soql, 'UTF-8');

        HttpRequest req = new HttpRequest();
        req.setEndpoint(instanceUrl + '/services/data/v62.0/tooling/query?q=' + encoded);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + sessionId);
        req.setTimeout(30000);

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() != 200) {
            throw new AuraHandledException('Failed to list reports: ' + res.getStatus());
        }

        Map<String, Object> body    = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        List<Object>        records = (List<Object>) body.get('records');
        List<ReportInfo>    result  = new List<ReportInfo>();
        if (records != null) {
            for (Object r : records) {
                Map<String, Object> rm = (Map<String, Object>) r;
                result.add(new ReportInfo(
                    (String) rm.get('Id'),
                    (String) rm.get('Name'),
                    rm.get('FolderName') != null ? (String) rm.get('FolderName') : ''
                ));
            }
        }
        return result;
    }

    private static Map<String, Object> fetchReportMetadata(String instanceUrl, String sessionId, String reportId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(instanceUrl + '/services/data/v62.0/analytics/reports/' + reportId + '?includeDetails=false');
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + sessionId);
        req.setTimeout(30000);

        HttpResponse res = new Http().send(req);
        if (res.getStatusCode() != 200) return null;

        Map<String, Object> detail = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        return (Map<String, Object>) detail.get('reportMetadata');
    }

    private static List<String> findFieldsInReport(Map<String, Object> metadata, List<String> oldFieldNames) {
        List<String> allPaths = new List<String>();

        List<Object> cols = (List<Object>) metadata.get('detailColumns');
        if (cols != null) for (Object c : cols) if (c != null) allPaths.add((String) c);

        List<Object> gd = (List<Object>) metadata.get('groupingsDown');
        if (gd != null) for (Object g : gd) {
            Object n = ((Map<String,Object>) g).get('name');
            if (n != null) allPaths.add((String) n);
        }

        List<Object> ga = (List<Object>) metadata.get('groupingsAcross');
        if (ga != null) for (Object g : ga) {
            Object n = ((Map<String,Object>) g).get('name');
            if (n != null) allPaths.add((String) n);
        }

        List<Object> filters = (List<Object>) metadata.get('reportFilters');
        if (filters != null) for (Object f : filters) {
            Object col = ((Map<String,Object>) f).get('column');
            if (col != null) allPaths.add((String) col);
        }

        Set<String> found = new Set<String>();
        for (String oldField : oldFieldNames) {
            for (String path : allPaths) {
                if (ReportUtils.fieldMatches(path, oldField)) { found.add(oldField); break; }
            }
        }
        return new List<String>(found);
    }

    // ── Inner classes ──────────────────────────────────────────────────────────

    private class ReportInfo {
        String id, name, folderName;
        ReportInfo(String i, String n, String f) { id = i; name = n; folderName = f; }
    }

    public class ScanResult {
        @AuraEnabled public Integer           totalScanned;
        @AuraEnabled public Integer           totalAffected;
        @AuraEnabled public List<AffectedReport> affectedReports;
        @AuraEnabled public List<String>      foundOldFields;
        @AuraEnabled public List<ScanError>   errors;
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
