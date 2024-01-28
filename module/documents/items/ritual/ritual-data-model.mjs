import {UseWeaponDataModel} from '../common/use-weapon-data-model.mjs';
import {ItemAttributesDataModel} from '../common/item-attributes-data-model.mjs';
import {DamageDataModel} from '../common/damage-data-model.mjs';
import {ImprovisedDamageDataModel} from '../common/improvised-damage-data-model.mjs';
import {ProgressDataModel} from '../common/progress-data-model.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {string} class.value
 * @property {UseWeaponDataModel} useWeapon
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {DamageDataModel} damage
 * @property {ImprovisedDamageDataModel} impdamage
 * @property {boolean} hasClock.value
 * @property {ProgressDataModel} progress
 * @property {"minor","medium","major","extreme"} potency.value
 * @property {'individual', 'small', 'large', 'huge'} area.value
 * @property {number} mpCost.value
 * @property {number} dLevel.value
 * @property {number} clock.value
 * @property {string} source.value
 * @property {boolean} hasRoll.value
 * @property {ImprovisedDamageDataModel} rollInfo.impdamage
 * @property {ItemAttributesDataModel} rollInfo.attributes
 * @property {number} rollInfo.accuracy.value
 */
export class RitualDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			class: new SchemaField({ value: new StringField() }),
			useWeapon: new EmbeddedDataField(UseWeaponDataModel, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(DamageDataModel, {}),
			impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
			hasClock: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			potency: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'medium', 'major', 'extreme'] }) }),
			area: new SchemaField({ value: new StringField({ initial: 'individual', choices: ['individual', 'small', 'large', 'huge'] }) }),
			mpCost: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			dLevel: new SchemaField({ value: new NumberField({ initial: 7, min: 0, integer: true, nullable: false }) }),
			clock: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
			hasRoll: new SchemaField({ value: new BooleanField() }),
			rollInfo: new SchemaField({
				impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
				attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
				accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			}),
		};
	}
}
