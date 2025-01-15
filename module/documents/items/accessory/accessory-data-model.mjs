import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof AccessoryDataModel) {
		const tags = [
			{
				tag: 'FU.DefenseAbbr',
				value: item.system.def.value,
			},
			{
				tag: 'FU.MagicDefenseAbbr',
				value: item.system.mdef.value,
			},
			{
				tag: 'FU.InitiativeAbbr',
				value: item.system.init.value,
			},
		].filter(({ value }) => value !== 0);
		if (tags.length > 0) {
			sections.push({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-tags.hbs',
				data: {
					tags,
				},
			});
		}

		if (item.system.quality.value) {
			sections.push({
				partial: 'systems/projectfu/templates/chat/partials/chat-item-quality.hbs',
				data: {
					quality: item.system.quality.value,
				},
			});
		}

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
 * @property {number} cost.value
 * @property {string} quality.value
 * @property {number} def.value
 * @property {number} mdef.value
 * @property {number} init.value
 * @property {string} source.value
 */
export class AccessoryDataModel extends foundry.abstract.TypeDataModel {
	static {
		deprecationNotice(this, 'isMartial.value');
		deprecationNotice(this, 'isBehaviour.value');
		deprecationNotice(this, 'weight.value');
		deprecationNotice(this, 'rollInfo.useWeapon.hrZero.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			quality: new SchemaField({ value: new StringField() }),
			def: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			mdef: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			init: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}

	transferEffects() {
		return this.parent.isEquipped;
	}
}
