import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';

export class RulesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'rules-table',
		getItems: (d) => d.itemTypes.rule,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.SpecialRule', headerSpan: 2 }),
			clock: CommonColumns.clockColumn({ getClock: (item) => (item.system.hasClock.value ? item.system.progress : null), clockSize: 30 }),
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Rule', type: 'rule' }),
		},
	};
}
