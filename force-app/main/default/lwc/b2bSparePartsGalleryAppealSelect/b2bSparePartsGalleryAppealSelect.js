import { LightningElement, api } from 'lwc';

export default class B2bSparePartsGalleryAppealSelect extends LightningElement {
    @api isAvailable
    @api rowId
    @api placeholder
    @api options
    isEnabled = false

    get isSelectDisabled() {
        return !this.isEnabled
    }

    onCheckboxChange() {
        this.isEnabled = !this.isEnabled

        if (!this.isEnabled) {
            const select = this.template.querySelector('.b2b-select')
            const option = select.querySelector('option').value
            select.value = option
        }

        this.dispatchEvent(new CustomEvent('availabilitychange', {
            bubbles: true,
            composed: true,
            detail: { rowId: this.rowId, isEnabled: this.isEnabled }
        }))
    }

    onSelectChange(event) {
        this.dispatchEvent(new CustomEvent('appealchange', {
            bubbles: true,
            composed: true,
            detail: { rowId: this.rowId, appealReason: event.target.value }
        }))
    }
}