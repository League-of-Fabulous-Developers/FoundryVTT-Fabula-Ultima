import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';

export class ClassesTableRenderer extends FUTableRenderer {
	/**
	 * @type TableConfig
	 */
	static TABLE_CONFIG = {
		cssClass: 'classes-table',
		getItems: (actor) => actor.itemTypes.class,
		renderDescription: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
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

	static async #renderLevelCell(item) {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-class-level.hbs', item);
	}
}
