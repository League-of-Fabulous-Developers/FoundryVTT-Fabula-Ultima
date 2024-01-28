import {FU} from '../../../helpers/config.mjs';
import {ItemAttributesDataModel} from '../common/item-attributes-data-model.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {number} damage.value
 * @property {WeaponType} type.value
 * @property {DamageType} damageType.value
 * @property {number} cost.value
 * @property {string} quality.value
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 */
export class BasicItemDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			type: new SchemaField({ value: new StringField({ choices: Object.keys(FU.weaponTypes) }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', blank: true, choices: Object.keys(FU.damageTypes) }) }),
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			quality: new SchemaField({ value: new StringField() }),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
		};
	}
}
