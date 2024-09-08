import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ArmorDataModel) {
		sections.push(item.createChatMessage(item, false).then((v) => ({ content: v.content })));
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} cost.value
 * @property {boolean} isMartial.value
 * @property {string} quality.value
 * @property {number} def.value
 * @property {number} mdef.value
 * @property {number} init.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {ItemAttributesDataModel} attributes
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 */
export class ArmorDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			def: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			mdef: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			init: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}

	prepareBaseData() {
		if (this.isMartial.value) {
			this.attributes.primary.value = '';
		}
	}

	transferEffects() {
		return this.parent.isEquipped && !this.parent.actor?.system.vehicle.armorActive;
	}
}
