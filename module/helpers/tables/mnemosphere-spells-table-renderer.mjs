import { SpellsTableRenderer } from './spells-table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

export class MnemosphereSpellsTableRenderer extends SpellsTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		getItems: (document) => document.system.spells,
		columns: {
			controls: CommonColumns.itemControlsColumn(
				{ label: 'FU.Spell', type: 'spell' },
				{
					hideDelete: false,
					disableDelete: MnemosphereSpellsTableRenderer.#isSheetLocked,
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
