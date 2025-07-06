import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof BehaviorDataModel) {
		CommonSections.description(sections, item.system.description, item.system.summary.value);
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {string} source.value
 */
export class BehaviorDataModel extends FUStandardItemDataModel {
	static defineSchema() {
		const { SchemaField, BooleanField, NumberField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			isBehavior: new SchemaField({ value: new BooleanField({ initial: true }) }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
		});
	}

	get attributePartials() {
		return [ItemPartialTemplates.controls, ItemPartialTemplates.behavior];
	}
}
