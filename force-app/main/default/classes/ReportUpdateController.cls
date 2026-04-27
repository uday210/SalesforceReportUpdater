public with sharing class ReportUpdateController {

    public class UpdateTarget {
        @AuraEnabled public String reportId;
        @AuraEnabled public String reportName;
        @AuraEnabled public String originalMetadataJson;
        @AuraEnabled public List<ReportUtils.FieldMapping> mappings;
    }

    public class UpdateResult {
        @AuraEnabled public List<UpdatedReport> updated;
        @AuraEnabled public List<UpdateError>   errors;
        public UpdateResult(List<UpdatedReport> u, List<UpdateError> e) { updated = u; errors = e; }
    }

    public class UpdatedReport {
        @AuraEnabled public String reportId;
        @AuraEnabled public String reportName;
        public UpdatedReport(String i, String n) { reportId = i; reportName = n; }
    }

    public class UpdateError {
        @AuraEnabled public String reportId;
        @AuraEnabled public String reportName;
        @AuraEnabled public String error;
        public UpdateError(String i, String n, String e) { reportId = i; reportName = n; error = e; }
    }

    @AuraEnabled
    public static UpdateResult updateReports(List<UpdateTarget> targets) {
        String sessionId   = UserInfo.getSessionId();
        String instanceUrl = URL.getOrgDomainUrl().toExternalForm();

        List<UpdatedReport> updated = new List<UpdatedReport>();
        List<UpdateError>   errors  = new List<UpdateError>();

        for (UpdateTarget target : targets) {
            try {
                String updatedJson = ReportUtils.analyzeAndUpdateMetadata(
                    target.originalMetadataJson, target.mappings
                );
                if (updatedJson == null) continue; // no changes

                HttpRequest req = new HttpRequest();
                req.setEndpoint(instanceUrl + '/services/data/v62.0/analytics/reports/' + target.reportId);
                req.setMethod('PATCH');
                req.setHeader('Authorization', 'Bearer ' + sessionId);
                req.setHeader('Content-Type', 'application/json');
                req.setBody('{"reportMetadata":' + updatedJson + '}');
                req.setTimeout(30000);

                HttpResponse res = new Http().send(req);

                if (res.getStatusCode() >= 200 && res.getStatusCode() < 300) {
                    updated.add(new UpdatedReport(target.reportId, target.reportName));
                } else {
                    errors.add(new UpdateError(target.reportId, target.reportName,
                        'HTTP ' + res.getStatusCode() + ': ' + res.getBody().abbreviate(200)));
                }
            } catch (Exception e) {
                errors.add(new UpdateError(target.reportId, target.reportName, e.getMessage()));
            }
        }

        return new UpdateResult(updated, errors);
    }
}
