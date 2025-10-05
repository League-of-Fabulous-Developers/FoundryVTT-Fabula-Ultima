import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { SYSTEM } from '../config.mjs';
import { SETTINGS } from '../../settings.js';

const accessoryItemTypes = new Set(['accessory', 'mnemosphereReceptacle']);

const descriptionRenderers = {
	accessory: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
	mnemosphereReceptacle: CommonDescriptions.descriptionWithTechnospheres((item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.slotCount })),
};

const equipStatusRenderers = {
	accessory: (item) => {
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
	},
};

export class AccessoriesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'accessories-table',
		getItems: (d) => d.items.filter((item) => accessoryItemTypes.has(item.type)),
		renderDescription: AccessoriesTableRenderer.#renderDescription,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Accessories', renderCaption: AccessoriesTableRenderer.#renderCaption }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: AccessoriesTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Accessory', type: () => (game.settings.get(SYSTEM, SETTINGS.technospheres) ? 'accessory,mnemosphereReceptacle' : 'accessory') }),
		},
	};

	static #renderDescription(item) {
		const descriptionRenderer = descriptionRenderers[item.type];
		return descriptionRenderer ? descriptionRenderer(item) : null;
	}

	static #renderCaption(item) {
		return item.system?.quality?.value;
	}

	static #renderEquipStatus(item) {
		const equipStatusRenderer = equipStatusRenderers[item.type];
		return equipStatusRenderer ? equipStatusRenderer(item) : null;
	}
}
