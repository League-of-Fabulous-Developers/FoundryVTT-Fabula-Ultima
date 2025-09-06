import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { FU } from '../config.mjs';

const includedItemTypes = new Set(['accessory', 'armor', 'shield', 'weapon']);

const costFields = {
	accessory: 'system.cost.value',
	armor: 'system.cost.value',
	shield: 'system.cost.value',
	weapon: 'system.cost.value',
};

const qualityFields = {
	accessory: 'system.quality.value',
	armor: 'system.quality.value',
	shield: 'system.quality.value',
	weapon: 'system.quality.value',
};

const descriptionRenderers = {
	accessory: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
	armor: CommonDescriptions.simpleDescription(),
	shield: CommonDescriptions.simpleDescription(),
	weapon: CommonDescriptions.descriptionWithTags((item) => {
		const tags = [];
		tags.push({ tag: FU.handedness[item.system.hands.value] });
		tags.push({ tag: FU.weaponTypes[item.system.type.value] });
		tags.push({ tag: FU.weaponCategories[item.system.category.value] });
		tags.push({ tag: 'FU.Versus', value: game.i18n.localize(FU.defenses[item.system.defense].abbr) });
		return tags;
	}),
};

const signum = (value) => {
	return value < 0 ? '-' : '+';
};
/**
 * @type {Record<string, ((item: FUItem) => string)>}
 */
const details = {
	accessory: CommonColumns.textColumn({ alignment: 'start', importance: 'low', getText: (item) => item.system.summary.value ?? '' }).renderCell,
	armor: (item) => {
		const data = {
			FU: FU,
			defense: {
				attribute: item.system.def.attribute,
				value: Math.abs(item.system.def.value),
				signum: signum(item.system.def.value),
			},
			magicDefense: {
				attribute: item.system.mdef.attribute,
				value: Math.abs(item.system.mdef.value),
				signum: signum(item.system.mdef.value),
			},
			initiative: {
				value: Math.abs(item.system.init.value),
				signum: signum(item.system.init.value),
			},
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equipment-armor-details'), data);
	},
	shield: (item) => {
		const data = {
			FU: FU,
			defense: {
				value: Math.abs(item.system.def.value),
				signum: signum(item.system.def.value),
			},
			magicDefense: {
				value: Math.abs(item.system.mdef.value),
				signum: signum(item.system.mdef.value),
			},
			initiative: {
				value: Math.abs(item.system.init.value),
				signum: signum(item.system.init.value),
			},
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equipment-shield-details'), data);
	},
	weapon: (item) => {
		const data = {
			FU: FU,
			check: {
				primary: item.system.attributes.primary.value,
				secondary: item.system.attributes.secondary.value,
				modifier: Math.abs(item.system.accuracy.value),
				signum: signum(item.system.accuracy.value),
			},
			damage: {
				type: item.system.damageType.value,
				value: Math.abs(item.system.damage.value),
				signum: signum(item.system.damage.value),
				hrZero: item.system.rollInfo.useWeapon.hrZero.value,
			},
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-equipment-weapon-details'), data);
	},
};

export class EquipmentTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'equipment-table',
		getItems: (document) => document.items.filter((item) => includedItemTypes.has(item.type)),
		renderDescription: EquipmentTableRenderer.#renderDescription,
		renderRowCaption: EquipmentTableRenderer.#renderRowCaption,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Equipment', headerSpan: 2 }),
			details: {
				hideHeader: true,
				renderCell: EquipmentTableRenderer.#renderDetails,
			},
			cost: CommonColumns.textColumn({ columnLabel: 'FU.Cost', importance: 'high', getText: EquipmentTableRenderer.#getCost }),
			controls: CommonColumns.itemControlsColumn(
				{ headerAlignment: 'end', custom: EquipmentTableRenderer.#renderCustomControlsHeader },
				{
					disableFavorite: (item) => !item.actor.isCharacterType,
					disableShare: (item) => item.actor.type !== 'party',
					disableSell: (item) => item.actor.type !== 'stash' || !item.actor.system.merchant,
					disableLoot: (item) => item.actor.type !== 'stash' || item.actor.system.merchant,
				},
			),
		},
	};

	static #renderDescription(item) {
		return descriptionRenderers[item.type]?.(item) ?? '';
	}

	static #renderRowCaption(item) {
		return foundry.utils.getProperty(item, qualityFields[item.type]) ?? '';
	}

	static #renderDetails(item) {
		if (item.type in details) {
			return details[item.type](item);
		}
		return '';
	}

	static #getCost(item) {
		return foundry.utils.getProperty(item, costFields[item.type]);
	}

	static #renderCustomControlsHeader() {
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/header/header-equipment-controls'), { action: 'createEquipment' });
	}
}
