import { ProgressDataModel } from '../common/progress-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof RuleDataModel) {
		if (item.system.hasClock.value) {
			CommonSections.clock(sections, item.system.progress);
		}

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
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {string} source
 */
export class RuleDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
