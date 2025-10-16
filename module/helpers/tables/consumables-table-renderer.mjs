import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class ConsumablesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'consumables-table',
		getItems: (d) => d.itemTypes.consumable,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Consumable' }),
			effect: CommonColumns.textColumn({ columnLabel: 'FU.Effect', alignment: 'start', getText: (item) => item.system.summary.value ?? '' }),
			ipCost: CommonColumns.textColumn({ columnLabel: 'FU.InventoryCost', getText: (item) => item.system.ipCost.value, importance: 'high' }),
			controls: CommonColumns.itemControlsColumn(
				{ type: 'consumable', label: 'FU.Consumable' },
				{
					hideFavorite: (item) => !item.actor.isCharacterType,
					hideShare: (item) => item.actor.type !== 'party',
					hideSell: (item) => !(item.actor.type === 'stash' && item.actor.system.merchant),
					hideLoot: (item) => !(item.actor.type === 'stash' && !item.actor.system.merchant),
				},
			),
		},
	};
}
