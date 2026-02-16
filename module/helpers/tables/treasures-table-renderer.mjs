import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { TradableTableRenderer } from './tradable-table-renderer.mjs';

export class TreasuresTableRenderer extends TradableTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'treasures-table',
		getItems: (d) => d.itemTypes.treasure,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Treasures' }),
			effect: CommonColumns.textColumn({ columnLabel: 'FU.Summary', alignment: 'start', getText: (item) => item.system.summary.value ?? '' }),
			quantity: CommonColumns.textColumn({ columnLabel: 'FU.Quantity', getText: (item) => item.system.quantity.value, importance: 'high' }),
			cost: CommonColumns.textColumn({ columnLabel: 'FU.Cost', getText: (item) => item.system.cost.value, importance: 'high' }),
			controls: CommonColumns.itemControlsColumn({ type: 'treasure', label: 'FU.Treasure' }, TradableTableRenderer.getCellOptions()),
		},
	};
}
