import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class RitualsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'rituals-table',
		getItems: (d) => d.itemTypes.ritual,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Rituals' }),
			mpCost: CommonColumns.textColumn({ columnLabel: 'FU.MindPointCost', getText: (item) => item.system.mpCost.value, importance: 'high' }),
			difficulty: CommonColumns.textColumn({ columnLabel: 'FU.DLAbbr', getText: (item) => item.system.dLevel.value, importance: 'high' }),
			clock: CommonColumns.ifElseColumn({
				columnName: 'FU.Clock',
				condition: (item) => item.system.hasClock.value,
				ifTrue: CommonColumns.clockColumn({ getClock: (item) => item.system.progress }).renderCell,
				otherwise: CommonColumns.textColumn({ getText: (item) => item.system.progress.max, importance: 'high' }).renderCell,
			}),
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Ritual', type: 'ritual' }),
		},
	};
}
