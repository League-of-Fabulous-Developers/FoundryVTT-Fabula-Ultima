import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';

export class ArmorsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'armors-table',
		getItems: (d) => d.itemTypes.armor,
		renderDescription: CommonDescriptions.descriptionWithTechnospheres((item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.mnemosphereSlots })),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Armors', cssClass: (item) => (item.system.isMartial.value ? 'after-martial-item-icon' : ''), renderCaption: ArmorsTableRenderer.#renderCaption }),
			def: CommonColumns.textColumn({ columnLabel: 'FU.DefenseAbbr', getText: ArmorsTableRenderer.#getDefenseText, importance: 'high' }),
			mDef: CommonColumns.textColumn({ columnLabel: 'FU.MagicDefenseAbbr', getText: ArmorsTableRenderer.#getMagicDefenseText, importance: 'high' }),
			init: CommonColumns.textColumn({ columnLabel: 'FU.InitiativeAbbr', getText: ArmorsTableRenderer.#getInitiativeText, importance: 'high' }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: ArmorsTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Armor', type: 'armor' }),
		},
	};

	static #renderCaption(item) {
		return item.system.quality.value;
	}

	static #getDefenseText(item) {
		const { attribute, value } = item.system.def;
		if (attribute) {
			if (value > 0) {
				return `${game.i18n.localize(FU.attributeAbbreviations[attribute])} + ${value}`;
			} else if (value < 0) {
				return `${game.i18n.localize(FU.attributeAbbreviations[attribute])} - ${Math.abs(value)}`;
			} else {
				return game.i18n.localize(FU.attributeAbbreviations[attribute]);
			}
		} else {
			return value;
		}
	}

	static #getMagicDefenseText(item) {
		const { attribute, value } = item.system.mdef;
		if (attribute) {
			if (value > 0) {
				return `${game.i18n.localize(FU.attributeAbbreviations[attribute])} + ${value}`;
			} else if (value < 0) {
				return `${game.i18n.localize(FU.attributeAbbreviations[attribute])} - ${Math.abs(value)}`;
			} else {
				return game.i18n.localize(FU.attributeAbbreviations[attribute]);
			}
		} else {
			return value;
		}
	}

	static #getInitiativeText(item) {
		const bonus = item.system.init.value;
		if (bonus > 0) {
			return `+ ${bonus}`;
		} else if (bonus < 0) {
			return `- ${Math.abs(bonus)}`;
		} else {
			return '—';
		}
	}

	static #renderEquipStatus(item) {
		const data = {
			action: 'equipArmor',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				armor: 'ra ra-helmet ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equip-status'), data);
	}
}
