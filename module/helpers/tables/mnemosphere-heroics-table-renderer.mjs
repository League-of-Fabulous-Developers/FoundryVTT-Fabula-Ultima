import { CommonColumns } from './common-columns.mjs';
import { HeroicsTableRenderer } from './heroics-table-renderer.mjs';

export class MnemosphereHeroicsTableRenderer extends HeroicsTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'mnemosphere-heroics-table',
		getItems: (item) => item.system.heroics,
		columns: {
			name: { headerSpan: 1 },
			'-=resourcePoints': null,
			controls: CommonColumns.itemControlsColumn(
				{ type: 'heroic', label: 'FU.Heroic' },
				{
					hideDelete: false,
					disableDelete: MnemosphereHeroicsTableRenderer.#isSheetLocked,
					hideMenu: true,
					hideFavorite: true,
				},
			),
		},
	};

	#sheetLocked;

	static #isSheetLocked() {
		return this.#sheetLocked;
	}

	async renderTable(document, options = {}) {
		this.#sheetLocked = options.sheetLocked;
		const result = await super.renderTable(document, options);
		this.#sheetLocked = undefined;
		return result;
	}
}
