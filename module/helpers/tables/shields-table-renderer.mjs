import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';

export class ShieldsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'shields-table',
		getItems: (d) => d.itemTypes.shield,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Shields', cssClass: (item) => (item.system.isMartial.value ? 'after-martial-item-icon' : ''), renderCaption: ShieldsTableRenderer.#renderCaption }),
			def: CommonColumns.textColumn({ columnLabel: 'FU.DefenseAbbr', getText: ShieldsTableRenderer.#getDefenseText, importance: 'high' }),
			mDef: CommonColumns.textColumn({ columnLabel: 'FU.MagicDefenseAbbr', getText: ShieldsTableRenderer.#getMagicDefenseText, importance: 'high' }),
			init: CommonColumns.textColumn({ columnLabel: 'FU.InitiativeAbbr', getText: ShieldsTableRenderer.#getInitiativeText, importance: 'high' }),
			equipStatus: {
				renderHeader: () => game.i18n.localize('FU.EquipStatus'),
				renderCell: ShieldsTableRenderer.#renderEquipStatus,
			},
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Shield', type: 'shield' }),
		},
	};

	static #renderCaption(item) {
		return item.system.quality.value;
	}

	static #getDefenseText(item) {
		const bonus = item.system.def.value;
		if (bonus > 0) {
			return `+ ${bonus}`;
		} else if (bonus < 0) {
			return `- ${Math.abs(bonus)}`;
		} else {
			return '—';
		}
	}

	static #getMagicDefenseText(item) {
		const bonus = item.system.mdef.value;
		if (bonus > 0) {
			return `+ ${bonus}`;
		} else if (bonus < 0) {
			return `- ${Math.abs(bonus)}`;
		} else {
			return '—';
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
			action: 'equipShield',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				mainHand: 'ra ra-heavy-shield ra-1xh',
				offHand: 'ra ra-shield ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equip-status'), data);
	}
}
