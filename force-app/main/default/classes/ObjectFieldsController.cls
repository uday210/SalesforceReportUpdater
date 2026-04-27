public with sharing class ObjectFieldsController {

    @AuraEnabled(cacheable=true)
    public static List<FieldInfo> getObjectFields(String objectName) {
        Schema.SObjectType sObjType = Schema.getGlobalDescribe().get(objectName);
        if (sObjType == null) {
            throw new AuraHandledException('Object not found: ' + objectName);
        }

        List<FieldInfo> fields = new List<FieldInfo>();
        Map<String, Schema.SObjectField> fieldMap = sObjType.getDescribe().fields.getMap();

        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult dfr = fieldMap.get(fieldName).getDescribe();
            FieldInfo fi = new FieldInfo();
            fi.apiName = dfr.getName();
            fi.label  = dfr.getLabel();
            fi.type   = dfr.getType().name().toLowerCase();
            List<String> refs = new List<String>();
            for (Schema.SObjectType ref : dfr.getReferenceTo()) {
                refs.add(ref.getDescribe().getName());
            }
            fi.referenceTo = refs;
            fields.add(fi);
        }

        fields.sort(new FieldComparator());
        return fields;
    }

    public class FieldInfo {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
        @AuraEnabled public List<String> referenceTo;
    }

    private class FieldComparator implements Comparator<FieldInfo> {
        public Integer compare(FieldInfo a, FieldInfo b) {
            Boolean aRef = a.type == 'reference';
            Boolean bRef = b.type == 'reference';
            if (aRef && !bRef) return -1;
            if (!aRef && bRef) return 1;
            return a.label.compareTo(b.label);
        }
    }
}
