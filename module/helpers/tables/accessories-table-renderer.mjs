import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';

export class AccessoriesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'accessories-table',
		getItems: (d) => d.itemTypes.accessory,
		renderDescription: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Accessories', renderCaption: AccessoriesTableRenderer.#renderCaption }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: AccessoriesTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Accessory', type: 'accessory' }),
		},
	};

	static #renderCaption(item) {
		return item.system.quality.value;
	}

	static #renderEquipStatus(item) {
		const data = {
			action: 'equipAccessory',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				accessory: 'fas fa-leaf ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equip-status'), data);
	}
}
