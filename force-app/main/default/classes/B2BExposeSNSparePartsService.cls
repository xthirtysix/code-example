/**
 * Used by `b2bSparePartsGallery` screen flow LWC component
 * 
 * @author Alexey Bezdetko
 * @since 2023
 */
public with sharing class B2BExposeSNSparePartsService {
    /**
     * Used by `b2bSparePartsGallery` LWC to display the list 
     * of spare parts related to asset and available for self-repair
     * 
     * @param   assetId
     * @return  `PartWrapper[]`
     */
    @AuraEnabled(cacheable=true)
    public static PartWrapper[] getParts(String assetId){
        try {
            // 1. get lwm and part records
            B2BExposeSNMainTabService.getLwmsAndRelatedParts(assetId);

            if (B2BExposeSNMainTabService.relatedParts.isEmpty()
            || B2BExposeSNMainTabService.categoryToLwmMap.isEmpty()) return new List<PartWrapper>();

            // 2. generate appeal reason select options
            List<B2BExposeSNMainTabService.ValueLabelWrapper> vlw =
                new List<B2BExposeSNMainTabService.ValueLabelWrapper>();
            
            for( Schema.PicklistEntry pickListValue : Service_Call_Lines__c
                .Appeal_Reason__c
                .getDescribe()
                .getPicklistValues()
            ){
                vlw.add(
                    new B2BExposeSNMainTabService.ValueLabelWrapper(
                        pickListValue.getValue(),
                        pickListValue.getLabel()
                    )
                );
            }

            // 2. generate result data
            PartWrapper[] result = new List<PartWrapper>();

            // prettier-ignore
            for (Product_Related_Part__c item : B2BExposeSNMainTabService.relatedParts) {
                String category = item.Son_Part_LW_Category__c == null
                    ? B2BExposeSNMainTabService.OTHER_CATEGORY
                    : item.Son_Part_LW_Category__c;

                PartWrapper part = new PartWrapper();

                part.id                 = item.Son_SKU__r?.Id;
                part.name               = item.Son_SKU__r?.Name;
                part.description        = item.Son_SKU__r?.Description;
                part.image              = item.Son_SKU__r?.Product_Image_Link__c;
                part.level              = item.Son_SKU__r?.Product_Level__c;
                part.maxQty             = Integer.valueOf(item.Son_Quantity__c);
                part.maxQtyMessage      = String.format(Label.B2B_Spare_Parts_Max_Quantity, new List<Object>{item.Son_Quantity__c});
                part.isOutOfWarranty    = B2BExposeSNMainTabService.categoryToLwmMap.get(category)?.Warranty_End_Date__c < System.today();
                part.appealReasons      = vlw;

                result.add(part);
            }

            return result;
        }
        catch (Exception e) {
            throw new AuraHandledException(e.getMessage() + '; ' + e.getStackTraceString());
        }
    }

    /**
     * Used by `b2bSparePartsGallery` LWC to display the list of
     * Selected Parts if Service_Call_Lines__c records were created
     * and stored in DB
     * 
     * @param   serviceCallId
     * @return  `PartWrapper[]`
     */
    @AuraEnabled
    public static PartWrapper[] getServiceCallLines(String serviceCallId) {
        try {
            PartWrapper[] result = new List<PartWrapper>();

            for (Service_Call_Lines__c part : [
                SELECT      Name,
                            Product_Name__c,
                            Old_Serial_Number__c,
                            New_Serial_Number__c,
                            Quantity__c,
                            Warranty__c,
                            Appeal__c,
                            Appeal_Reason__c
                FROM        Service_Call_Lines__c
                WHERE       Service_Call__c = :serviceCallId
            ]) {
                PartWrapper pw = new PartWrapper();

                pw.id               = part.Id;
                pw.description      = part.Name;
                pw.name             = part.Product_Name__c.capitalize();
                pw.oldSerialNumber  = part.Old_Serial_Number__c;
                pw.newSerialNumber  = part.New_Serial_Number__c;
                pw.quantity         = Integer.valueOf(part.Quantity__c);
                pw.warranty         = part.Warranty__c;
                pw.isOutOfWarranty  = !part.Appeal__c;
                pw.appealReason     = part.Appeal_Reason__c;

               result.add(pw);
            }

            return result;

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Used by `B2B: Create RMA/Self Repair (Sc)` Screen Flow
     * to parse spare parts screen generated data into
     * `Service_Call_Lines__c` records, and perform `DML` operations
     * depending on return value
     * 
     * @param   partsJson - serialized `ServiceCallWrapper`
     * @return  `List<List<Service_Call_Lines__c>>`
     */
    @InvocableMethod(
        label='Spare Parts'
        description='Deserialize spare parts JSON into Service_Call_Lines__c'
    )
    public static List<List<Service_Call_Lines__c>> parseSpareParts(String[] partsJson) {

        if (partsJson.isEmpty()) return new List<List<Service_Call_Lines__c>>();

        ServiceCallWrapper deserializedString   = (ServiceCallWrapper) JSON.deserialize(partsJson[0], ServiceCallWrapper.class);
        Service_Call__c serviceCall             = (Service_Call__c) deserializedString.serviceCall;
        PartWrapper[] parts                     = (PartWrapper[]) deserializedString.parts;
        String[] markedForDelete                = (String[]) deserializedString.markedForDelete;

        // delete service call lines
        if (markedForDelete != null && !markedForDelete.isEmpty()) {
            Service_Call_Lines__c[] linesToDelete = new List<Service_Call_Lines__c>();

            for (String sclId : markedForDelete) {
                linesToDelete.add(new Service_Call_Lines__c(Id = sclId));
            }

            delete linesToDelete;
        }

        if (parts == null && parts.isEmpty()) return new List<List<Service_Call_Lines__c>>();

        Service_Call_Lines__c[] serviceCallLines = new List<Service_Call_Lines__c>();

        for (PartWrapper part : parts) {
            serviceCallLines.add(new Service_Call_Lines__c(
                Id                      = part.id,
                Name                    = part.description?.toUpperCase(),
                Product_Name__c         = part.name?.toUpperCase(),
                Old_Serial_Number__c    = part.oldSerialNumber,
                New_Serial_Number__c    = part.newSerialNumber,
                Quantity__c             = part.quantity,
                Warranty__c             = part.warranty,
                Appeal__c               = !part?.isOutOfWarranty,
                Appeal_Reason__c        = part.appealReason,
                Service_Call__c         = serviceCall.Id
            ));
        }

        update serviceCall;
        upsert serviceCallLines;

        return new List<List<Service_Call_Lines__c>>{serviceCallLines};
    }

    public class PartWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String description;
        @AuraEnabled public String image;
        @AuraEnabled public String level;
        @AuraEnabled public Integer maxQty;
        @AuraEnabled public String maxQtyMessage;
        @AuraEnabled public Boolean isOutOfWarranty;
        @AuraEnabled public B2BExposeSNMainTabService.ValueLabelWrapper[] appealReasons;
        // Service_Call_Line__c fields only
        @AuraEnabled public String oldSerialNumber;
        @AuraEnabled public String newSerialNumber;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public String warranty;
        @AuraEnabled public String appealReason;
    }

    public class ServiceCallWrapper {
        public Service_Call__c serviceCall;
        public PartWrapper[] parts;
        public String[] markedForDelete;
    }
}