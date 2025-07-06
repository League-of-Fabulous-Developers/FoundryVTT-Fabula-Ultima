import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { FUSubTypedItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item, flags) => {
	if (item?.system instanceof ConsumableDataModel) {
		CommonSections.tags(sections, [{ tag: FU.consumableType[item.system.subtype.value] }, { tag: 'FU.InventoryAbbr', value: item.system.ipCost.value, flip: true }]);
		CommonSections.description(sections, item.system.description, item.system.summary.value);
		const targets = CheckConfiguration.inspect(check).getTargetsOrDefault();
		CommonSections.targeted(sections, actor, item, targets, flags);
		CommonSections.spendResource(sections, actor, item, [], flags);

		CommonEvents.item(actor, item);
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} ipCost.value
 * @property {string} source.value
 */
export class ConsumableDataModel extends FUSubTypedItemDataModel {
	static defineSchema() {
		const { SchemaField, NumberField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			ipCost: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.ipCostField, ItemPartialTemplates.behaviorField];
	}
}
