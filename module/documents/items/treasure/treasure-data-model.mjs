import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { SETTINGS } from '../../../settings.js';
import { FUSubTypedItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof TreasureDataModel) {
		const tags = [
			{
				tag: FU.treasureType[item.system.subtype.value],
			},
		];
		if (item.system.cost.value) {
			tags.push({
				value: `${item.system.cost.value} ${game.settings.get(SYSTEM, SETTINGS.optionRenameCurrency)}`,
			});
		}
		if (item.system.quantity.value) {
			tags.push({
				value: `${game.i18n.localize('FU.Quantity')}: ${item.system.quantity.value}`,
			});
		}
		if (item.system.origin.value) {
			tags.push({
				value: `${game.i18n.localize('FU.Origin')}: ${item.system.origin.value}`,
			});
		}
		CommonSections.tags(sections, tags);
		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} cost.value
 * @property {number} quantity.value
 * @property {string} origin.value
 * @property {string} source.value
 */
export class TreasureDataModel extends FUSubTypedItemDataModel {
	static defineSchema() {
		const { SchemaField, StringField, NumberField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			quantity: new SchemaField({ value: new NumberField({ initial: 1, min: 0, integer: true, nullable: false }) }),
			origin: new SchemaField({ value: new StringField() }),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.treasure];
	}
}
