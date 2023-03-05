import { LightningElement, api } from 'lwc'
import LABELS from 'c/b2bLabelsAndConstancesLoader';

const ARTICLE_ROLE = 'article'
const INITIAL_CLASSES = 'card slds-var-p-around_xx-small'
const ENTER_KEYCODE = 13
const QUANTITY_STEP = 1
const MIN_QUANTITY = 1
const ADD_PART_EVENT = 'addpart'

export default class B2bSparePartsGalleryCard extends LightningElement {
    /**
     * @type {productPart}
     * 
     * @typedef {Object} productPart        Part object
     * @property {String} id                Part Salesforce id
     * @property {String} description       Part human-readable name
     * @property {String} name              Part serial number name
     * @property {String} image             Part image URL
     * @property {String} level             Part category
     * @property {Number} maxQty            Part max quantity order
     * @property {Boolean} isUnderWarranty  Is part under warranty
     */
    @api productPart
    isFirstRender
    quantityValue = 1

    renderedCallback() {
        if (!this.isFirstRender) return

        this.template.role = ARTICLE_ROLE
        this.template.classList.add(INITIAL_CLASSES)
        this.isFirstRender = false
    }

    get labels() {
        return LABELS
    }

    get quantity() {
        return { min: MIN_QUANTITY, max: this.productPart.maxQty, step: QUANTITY_STEP }
    }

    get decrementDisabled() {
        return this.quantityValue <= MIN_QUANTITY
    }

    get incrementDisabled() {
        return this.quantityValue >= this.productPart.maxQty
    }

    onLabelKeypress(event) {
        if (event.keyCode === ENTER_KEYCODE) {
            event.currentTarget.firstChild.checked = !event.currentTarget.firstChild.checked
        }
    }

    onQuantityChange(event) {
        if (+event.target.value < MIN_QUANTITY) {
            event.target.value = MIN_QUANTITY
        } else if (+event.target.value > this.productPart.maxQty) {
            event.target.value = this.productPart.maxQty
        }

        this.quantityValue = +event.target.value
    }

    onDecrementClick() {
        if (this.decrementDisabled) return

        this.quantityValue -= this.quantity.step
    }

    onIncrementClick() {
        if (this.incrementDisabled) return

        this.quantityValue += this.quantity.step
    }

    onFormSubmit(event) {
        event.preventDefault()
        event.stopPropagation()


        if (event.target.checkValidity()) {
            const oldSerialNumber = this.template.querySelector('[data-id="old"]')?.value
            const newSerialNumber = this.template.querySelector('[data-id="new"]')?.value

            this.dispatchEvent(new CustomEvent(ADD_PART_EVENT, {
                detail: {
                    ...this.productPart,
                    quantity: this.quantityValue,
                    oldSerialNumber,
                    newSerialNumber
                }
            }))
        }
    }
}