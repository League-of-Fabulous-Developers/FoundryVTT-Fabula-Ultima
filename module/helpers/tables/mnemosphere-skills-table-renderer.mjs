import { CommonColumns } from './common-columns.mjs';
import { SkillsTableRenderer } from './skills-table-renderer.mjs';

export class MnemosphereSkillsTableRenderer extends SkillsTableRenderer {
	/** @type {TableConfig} */
	static TABLE_CONFIG = {
		cssClass: 'mnemosphere-skills-table',
		getItems: (item) => item.system.skills,
		columns: {
			name: { headerSpan: 1 },
			'-=resourcePoints': null,
			controls: CommonColumns.itemControlsColumn(
				{ type: 'skill', label: 'FU.Skill' },
				{
					hideDelete: false,
					disableDelete: MnemosphereSkillsTableRenderer.#isSheetLocked,
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
