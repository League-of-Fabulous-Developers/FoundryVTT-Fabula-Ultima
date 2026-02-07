import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';

export class ClassesTableRenderer extends FUTableRenderer {
	/**
	 * @type TableConfig
	 */
	static TABLE_CONFIG = {
		cssClass: 'classes-table',
		getItems: ClassesTableRenderer.#getItems,
		renderDescription: CommonDescriptions.descriptionWithTags(ClassesTableRenderer.#getTags),
		columns: {
			name: CommonColumns.itemNameColumn(),
			level: {
				renderHeader: () => game.i18n.localize('FU.Level'),
				headerAlignment: 'center',
				renderCell: ClassesTableRenderer.#renderLevelCell,
			},
			controls: CommonColumns.itemControlsColumn({ type: 'class', label: 'FU.Class' }),
		},
	};

	static #getItems(actor) {
		const items = [];
		for (const item of actor.allItems()) {
			if (item.type === 'class') {
				items.push(item);
			}
			if (item.type === 'mnemosphere' && item.system.socketed) {
				items.push(item);
			}
		}
		return items;
	}

	static #getTags(item) {
		if (item.type === 'class') {
			return item.system.getTags();
		}
		return [];
	}

	static async #renderLevelCell(item) {
		let data;
		if (item.type === 'class') {
			data = { current: item.system.level.value, max: item.system.level.max, action: 'modifyClassLevel' };
		}
		if (item.type === 'mnemosphere') {
			data = { current: item.system.level, max: item.system.maxLevel, action: 'modifyLevel' };
		}
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-class-level.hbs', data);
	}
}
