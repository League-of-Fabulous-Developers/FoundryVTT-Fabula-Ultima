import { CheckHooks } from '../../../checks/check-hooks.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof BehaviorDataModel) {
		if (item.system.summary.value || item.system.description) {
			sections.push(async () => ({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
				data: {
					summary: item.system.summary.value,
					description: await TextEditor.enrichHTML(item.system.description),
				},
			}));
		}
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
export class BehaviorDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			isBehavior: new SchemaField({ value: new BooleanField({ initial: true }) }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
