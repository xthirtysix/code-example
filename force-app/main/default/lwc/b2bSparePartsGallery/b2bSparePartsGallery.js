import { LightningElement, api, track, wire } from 'lwc'
import { NavigationMixin } from 'lightning/navigation'
import { CurrentPageReference } from 'lightning/navigation'

import getParts from '@salesforce/apex/B2BExposeSNSparePartsService.getParts'
import getServiceCallLines from '@salesforce/apex/B2BExposeSNSparePartsService.getServiceCallLines'

import LABELS from 'c/b2bLabelsAndConstancesLoader';
import { storage, constants } from 'c/b2bSparePartsUtils';

export default class B2bSparePartsGallery extends NavigationMixin(LightningElement) {

    /* Flow input variables START */
    @api assetId
    @api serviceCallId
    /* Flow input variables END */

    /**
     * Left panel parts
     * @type {productPart[]}
     *
     * @typedef {Object} productPart                    Part object
     * @property {String} productPart.id                Part Salesforce id
     * @property {String} productPart.description       Part human-readable name
     * @property {String} productPart.name              Part serial number name
     * @property {String} productPart.image             Part image URL
     * @property {String} productPart.level             Part category
     * @property {Number} productPart.maxQty            Part max quantity order
     * @property {Boolean} productPart.isOutOfWarranty  Is part out of warranty
     */
    @track mainData = []
    /**
     * @type {productPart[]} parts to store in DB
     */
    @track selectedParts = []
    /**
     * @type {String[]} array of Id's with appeal reasons enabled 
     */
    @track enabledAppealReasons = []
    /**
     * @type {{[sku: String]: String}} map of Service_Call_Line__c SKUs to it's Ids already stored in DB
     */
    @track savedPartSkuToIdMap = {}
    /**
     * @type {String[]} array of Id's to delete from database
     */
    @track markedForDelete = []
    searchableValue
    isWaitingForParts
    repairabilityError

    @api
    validate() {
        /**
         * @type {validationError[]}
         * 
         * @typedef {Object} validationError
         * @property {String} name
         * @property {String} message
         */
        const errors = []

        // 1. validate repairability error
        if (typeof this.isWaitingForParts === 'undefined' && this.isRepairabilityVisible) {
            errors.push({ name: 'repairabilityError', message: this.labels.b2bSparePartsRepairabilityError })
        }

        // clear repairability storage if repairability status wasn't required
        this.isRepairabilityVisible
            ? storage.repairability.set(this.isWaitingForParts)
            : storage.repairability.clear()

        // this.selectedParts.forEach(part => {
        //     if (part.isOutOfWarranty && !part.appealReason && ~this.enabledAppealReasons.indexOf(part.id)) {
        //         errors.appealReasonError = true
        //     }
        // })

        switch (!!errors.length) {
            // if errors were found store custom error messages and selected parts
            case true:
                storage.errors.set(errors)

                return { isValid: false, errorMessage: '' }
            // if everything's valid, clear parts and errors local storage and proceed
            default:
                storage.errors.clear()
                storage.selectedParts.clear()
                storage.markedForDelete.clear()
                storage.skuToId.clear()

                return { isValid: true }
        }
    }

    /**
     * @type {ServiceCallWrapper}
     * @typedef ServiceCallWrapper
     * @property {Service_Call__c} serviceCall 
     * @property {PartWrapper[]} parts
     * @property {String[] | null} markedForDelete
     * 
     * @returns {String} stringified `ServiceCallWrapper`
     * 
     * @readonly
     * @memberof B2bSparePartsGallery
     */

    @api
    get sparePartsJson() {
        return JSON.stringify({
            serviceCall: {
                Id: this.serviceCallId,
                B2B_Waiting_for_Parts_from_Maytronics__c: this.isRepairabilityVisible && this.isWaitingForParts
            },
            parts: this.selectedParts.map(part => ({
                id: this.savedPartSkuToIdMap[part.name] || null,
                description: part.description,
                name: part.name,
                oldSerialNumber: part.oldSerialNumber,
                newSerialNumber: part.newSerialNumber,
                quantity: part.quantity,
                warranty: constants.PRODUCT_WARRANTY_TO_FIELD_VALUE.get(!part.isOutOfWarranty),
                isOutOfWarranty: part.isOutOfWarranty,
                appeal: part.isOutOfWarranty,
                appealReason: part.appealReason || null,
            })),
            markedForDelete: this.markedForDelete
        })
    }

    @wire(CurrentPageReference)
    pageReference

    @wire(getParts, { assetId: '$assetId' })
    wiredProducts({ error, data }) {
        if (data) {
            this.mainData = [
                // first sort items that matches to PRODUCT_LEVEL_TO_ORDER map
                ...data
                    .filter(part => (typeof constants.PRODUCT_LEVEL_TO_ORDER.get(part?.level?.toLowerCase()) !== 'undefined'))
                    .sort((a, b) => this._compareSortableParts(a, b)),
                // then sort items from other categories alphabetically
                ...data
                    .filter(part => (typeof constants.PRODUCT_LEVEL_TO_ORDER.get(part?.level?.toLowerCase()) === 'undefined'))
                    .sort((a, b) => this._compareNonSortableParts(a, b))
            ].map(part => ({
                ...part,
                description: part?.description?.toLowerCase(),
                disabled: false,
                warranty: this.productWarrantyToLabelMap[(!part.isOutOfWarranty).toString()],
            }))
        } else if (error) {
            console.error(error)
        }
    }

    get labels() {
        return LABELS
    }

    get parts() {
        return this.searchableValue
            ? this.mainData
                .filter(
                    (part) => (
                        // either part name contains searchable value...
                        part.name
                            ?.toLowerCase()
                            .includes(this.searchableValue.toLowerCase()) ||
                        // ... or part description contains it
                        part.description
                            ?.toLowerCase()
                            .includes(this.searchableValue.toLowerCase())
                    )
                )
            : this.mainData
    }

    get partColumns() {
        return [
            {
                label: "Id",
                type: "Text",
                fieldName: "id",
                hideLabel: true,
                hideDefaultActions: true,
                fixedWidth: 1
            },
            {
                label: this.labels.b2bSparePartsTablePartName,
                type: "Text",
                fieldName: "description",
                hideDefaultActions: true,
            },
            {
                label: this.labels.b2bSparePartsTablePartNumber,
                type: "Text",
                fieldName: "name",
                hideDefaultActions: true,
            },
            {
                label: this.labels.b2bSparePartsTablePartQuantity,
                type: "Number",
                fieldName: "quantity",
                initialWidth: 50,
                sortable: false,
                hideDefaultActions: true
            },
            {
                label: this.labels.b2bSparePartsTablePartWarranty,
                type: "Text",
                fieldName: "warranty",
                hideDefaultActions: true,
            },
            {
                label: this.labels.b2bSparePartsTablePartAppealReason,
                fieldName: "appeal",
                type: "appealReason",
                hideDefaultActions: true,
                initialWidth: 315,
                typeAttributes: {
                    value: { fieldName: "appeal" },
                    options: { fieldName: "appealReasons" },
                    enabled: { fieldName: "isOutOfWarranty" },
                    rowId: { fieldName: "id" },
                    isError: { fieldApiName: "isAppealInvalid" },
                    placeholder: this.labels.b2bSparePartsAppealPlaceholder
                }
            },
            {
                type: "deleteRow",
                fixedWidth: 65,
                sortable: false,
                hideDefaultActions: true,
                typeAttributes: {
                    rowId: { fieldName: "id" },
                    rowName: { fieldName: "name" }
                }
            },
        ]
    }

    get partsIds() {
        return this.selectedParts.map(item => item.id)
    }

    get productWarrantyToLabelMap() {
        return {
            true: this.labels.b2bSparePartsWarranty,
            false: this.labels.b2bSparePartsNoWarranty
        }
    }

    get isRepairabilityVisible() {
        return this.selectedParts?.length && !this.enabledAppealReasons?.length
    }

    get isRepairabilityError() {
        return this.repairabilityError && typeof this.isWaitingForParts === 'undefined'
    }

    get repairabilityRadioGroup() {
        return [
            { id: 1, value: true, label: this.labels.b2bSparePartsRepairabilityWaiting, checked: this.isWaitingForParts === true },
            { id: 2, value: false, label: this.labels.b2bSparePartsRepairabilityStarting, checked: this.isWaitingForParts === false }
        ]
    }

    connectedCallback() {
        /**
         * @type {validationError[]}
         */
        const errors                = storage.errors.get()
        const selectedParts         = storage.selectedParts.get()
        const repairabilityStatus   = storage.repairability.get()
        const markedForDelete       = storage.markedForDelete.get()
        const skuToIdMap            = storage.skuToId.get()

        // a. if selected items were stored, restore them from local storage
        if (typeof selectedParts === 'object' && Array.isArray(selectedParts)) {
            this.selectedParts = [...selectedParts]
        // b. 
        } else if (typeof selectedParts === 'undefined') {
            getServiceCallLines({ serviceCallId: this.serviceCallId })
                .then(data => {
                    if (data.length) {
                        this.selectedParts = data

                        data.forEach(part => {
                            this.savedPartSkuToIdMap[part.name] = part.id
                        })

                        storage.skuToId.set(this.savedPartSkuToIdMap)
                    }
                }
            )
        }

        if (typeof repairabilityStatus === 'boolean') {
            this.isWaitingForParts = repairabilityStatus
        }

        if (typeof markedForDelete === 'object' && Array.isArray(markedForDelete)) {
            this.markedForDelete = markedForDelete
        }

        if (typeof skuToIdMap === 'object' && !Array.isArray(skuToIdMap) && skuToIdMap !== null) {
            this.savedPartSkuToIdMap = skuToIdMap
        }

        if (typeof errors === 'object' && Array.isArray(errors)) {
            for (const {name, message} of errors) {
                this[name] = message 
            }
        }

        storage.repairability.clear()
        storage.errors.clear()
    }

    onExposeSNClick(event) {
        event.preventDefault()

        // generate Exploded View URL...
        this[NavigationMixin.GenerateUrl]({
            type: constants.PAGE_TYPE,
            attributes: {
                name: constants.EXPLODED_VIEW_PAGE_API_NAME,
            },
            state: this.pageReference.state
            // ...then open it in a new tab
        }).then((url) => {
            window.open(url, constants.URL_TARGET)
        })
    }

    onSearchInput(event) {
        this.searchableValue = event.target.value
    }

    onAddPart(event) {
        if (this._isAddPartDisabled(event.detail.id)) return

        // disable Add part button
        this.mainData = this.mainData.map((part) => {
            if (part.id === event.detail.id) part.disabled = true

            return part
        })

        //undo delete if saved in DB part was removed from list and then added again
        if (typeof this.savedPartSkuToIdMap[event.detail.name] !== 'undefined') {
            this.markedForDelete = this.markedForDelete.filter(id => id !== this.savedPartSkuToIdMap[event.detail.name])

            storage.markedForDelete.set(this.markedForDelete)
        }

        // add part to table
        this.selectedParts = [
            ...this.selectedParts, event.detail
        ]

        storage.selectedParts.set(this.selectedParts)
    }

    onRowDelete(event) {
        // enable Add part button
        this.mainData = this.mainData.map((part) => {
            if (part.id === event.detail.id) part.disabled = false

            return part
        })

        // mark for delete if item was already saved to db
        if (typeof this.savedPartSkuToIdMap[event.detail.name] !== 'undefined') {
            this.markedForDelete = [...this.markedForDelete, this.savedPartSkuToIdMap[event.detail.name]]

            storage.markedForDelete.set(this.markedForDelete)
        }

        // remove part from table
        this.selectedParts = this.selectedParts.filter(({ name }) => name !== event.detail.name)

        storage.selectedParts.set(this.selectedParts)

        if (this.isRepairabilityVisible) this.isWaitingForParts = undefined
    }

    onAppealAvailabilityChange(event) {
        if (event.detail.isEnabled) {
            this.enabledAppealReasons.push(event.detail.rowId)
        } else {
            this.enabledAppealReasons = this.enabledAppealReasons.filter(id => id !== event.detail.rowId)
        }
    }

    onAppealChange(event) {
        if (event.detail.rowId && event.detail.appealReason) {
            const changedPartIndex = this.selectedParts.findIndex(({ id }) => id === event.detail.rowId)
            this.selectedParts[changedPartIndex].appealReason = event.detail.appealReason
            this.selectedParts[changedPartIndex].isAppealInvalid = false
        }
    }

    onRadioClick(event) {
        this.isWaitingForParts = event.target.dataset.value === 'true'

        storage.repairability.set(this.isWaitingForParts)
    }

    /**
     * 
     * @param {String} id
     * @return {Boolean} 
     * @memberof B2bSparePartsGallery
     */
    _isAddPartDisabled(id) {
        return typeof this.partsIds.find(partId => partId === id) !== 'undefined'
    }

    /**
     * Sorts parts that DO match PRODUCT_LEVEL_TO_ORDER map
     * @param {productPart} a - spare part
     * @param {productPart} b - spare part
     */
    _compareSortableParts(a, b) {
        // put items from PRODUCT_LEVEL_TO_ORDER to the beginning of the list first
        return constants.PRODUCT_LEVEL_TO_ORDER.get(a.level.toLowerCase()) - constants.PRODUCT_LEVEL_TO_ORDER.get(b.level.toLowerCase())
    }

    /**
     * Sorts parts that DON'T match PRODUCT_LEVEL_TO_ORDER map
     * @param {productPart} a - spare part
     * @param {productPart} b - spare part
     */
    _compareNonSortableParts(a, b) {
        if (typeof a.level === 'undefined' && typeof b.level === 'undefined') {
            return 0
        } else if (typeof a.level === 'undefined') {
            return 1
        } else if (typeof b.level === 'undefined') {
            return -1
        } else {
            // sort not-listed groups alphabetically
            return a.level.localeCompare(b.level)
        }
    }
}