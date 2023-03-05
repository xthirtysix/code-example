import LightningDatatable from 'lightning/datatable';
// appeal reason
import appealReason from './appealReason.html';
import deleteRow from './deleteRow.html';

export default class B2bSparePartsTable extends LightningDatatable {
    static customTypes = {
        appealReason: {
            template: appealReason,
            standardCellLayout: true,
            typeAttributes: ['label', 'value', 'placeholder', 'options', 'enabled', 'rowId'],
        },
        deleteRow: {
            template: deleteRow,
            standardCellLayout: true,
            typeAttributes: ['rowId', 'rowName']
        }
    }
}