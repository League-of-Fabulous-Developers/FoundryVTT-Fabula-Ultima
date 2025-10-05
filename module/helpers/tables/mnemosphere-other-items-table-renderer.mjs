import { OtherItemsTableRenderer } from './other-items-table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

export class MnemosphereOtherItemsTableRenderer extends OtherItemsTableRenderer {
	/** @type {TableConfig} */
	static TABLE_CONFIG = {
		getItems: (item) => item.system.other,
		columns: {
			controls: CommonColumns.itemControlsColumn(
				{ custom: `<span></span>` },
				{
					hideFavorite: true,
					hideMenu: true,
					hideDelete: false,
					disableDelete: MnemosphereOtherItemsTableRenderer.#isSheetLocked,
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
