// constants
const SELECTED_PARTS_STORAGE_KEY = 'selectedParts'
const REPAIRABILITY_STATUS_STORAGE_KEY = 'repairabilityStatus'
const ERRORS_STORAGE_KEY = 'sparePartsErrors'
const MARKED_FOR_DELETE_STORAGE_KEY = 'markedForDelete'
const SKU_TO_ID_STORAGE_KEY = 'skuToIdMap'

function _setItem(key, value) {
    if (typeof value !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value))
    }
}

/**
 * Returns {undefined} if item wasn't found
 * 
 * @param {String} key 
 * @returns {undefined | any}
 */
function _getItem(key) {
    const value = window.localStorage.getItem(key)

    if (value === null) return undefined

    return JSON.parse(value)
}

function _removeItem(key) {
    window.localStorage.removeItem(key)
}

// storage util
const storage = {
    selectedParts: {
        get() {
            return _getItem(SELECTED_PARTS_STORAGE_KEY)
        },
        set(value) {
            if (typeof value === 'undefined') return

            _setItem(SELECTED_PARTS_STORAGE_KEY, value)
            return
        },
        clear() {
            _removeItem(SELECTED_PARTS_STORAGE_KEY)
            return
        }
    },
    repairability: {
        get() {
            return _getItem(REPAIRABILITY_STATUS_STORAGE_KEY)
        },
        set(value) {
            _setItem(REPAIRABILITY_STATUS_STORAGE_KEY, value)
            return
        },
        clear() {
            _removeItem(REPAIRABILITY_STATUS_STORAGE_KEY)
            return
        }
    },
    errors: {
        get() {
            return _getItem(ERRORS_STORAGE_KEY)
        },
        set(value) {
            _setItem(ERRORS_STORAGE_KEY, value)
            return
        },
        clear() {
            _removeItem(ERRORS_STORAGE_KEY)
            return
        }
    },
    markedForDelete: {
        get() {
            return _getItem(MARKED_FOR_DELETE_STORAGE_KEY)
        },
        set(value) {
            if (typeof value !== 'object' || !Array.isArray(value)) return

            if (value.length) {
                _setItem(MARKED_FOR_DELETE_STORAGE_KEY, value)
            } else {
                _removeItem(MARKED_FOR_DELETE_STORAGE_KEY)
            }

            return
        },
        clear() {
            _removeItem(MARKED_FOR_DELETE_STORAGE_KEY)
            return
        }
    },
    skuToId: {
        get() {
            return _getItem(SKU_TO_ID_STORAGE_KEY)
        },
        set(value) {
            _setItem(SKU_TO_ID_STORAGE_KEY, value)
            return
        },
        clear() {
            _removeItem(SKU_TO_ID_STORAGE_KEY)
            return
        }
    },
    clearAll() {
        _removeItem(SELECTED_PARTS_STORAGE_KEY)
        _removeItem(REPAIRABILITY_STATUS_STORAGE_KEY)
        _removeItem(ERRORS_STORAGE_KEY)
        _removeItem(MARKED_FOR_DELETE_STORAGE_KEY)
        _removeItem(SKU_TO_ID_STORAGE_KEY)
    }
}

const PRODUCT_LEVEL_TO_ORDER = new Map([
    ['mu', 0],
    ['motor unit-commercial', 0],
    ['motor unit-residential', 0],
    ['motor unit', 0],
    ['power supply', 1],
    ['cables', 2],
    ['brushes', 3],
    ['filters', 4],
    ['tracks & belts', 5]
])

const PRODUCT_WARRANTY_TO_FIELD_VALUE = new Map([
    [true, 'In Warranty'],
    [false, 'Out of Warranty']
])

const PAGE_TYPE = 'comm__namedPage'
const EXPLODED_VIEW_PAGE_API_NAME = 'Expose_SN_Exploded_View__c'
const URL_TARGET = '_blank'

const constants = {
    PRODUCT_LEVEL_TO_ORDER,
    PRODUCT_WARRANTY_TO_FIELD_VALUE,
    PAGE_TYPE,
    EXPLODED_VIEW_PAGE_API_NAME,
    URL_TARGET
}

export { storage, constants }