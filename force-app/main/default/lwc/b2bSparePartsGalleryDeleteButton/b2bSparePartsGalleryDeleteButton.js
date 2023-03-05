import { LightningElement, api } from 'lwc';

export default class B2bSparePartsGalleryDeleteButton extends LightningElement {
    @api rowId
    @api rowName

    onButtonClick() {
        this.dispatchEvent(
            new CustomEvent('delete', {
                bubbles: true,
                composed: true,
                detail: {id: this.rowId, name: this.rowName}
            })
        )
    }
}