import {UseWeaponDataModel} from '../common/use-weapon-data-model.mjs';
import {ItemAttributesDataModel} from '../common/item-attributes-data-model.mjs';
import {DamageDataModel} from '../common/damage-data-model.mjs';
import {ImprovisedDamageDataModel} from '../common/improvised-damage-data-model.mjs';
import {SpellMigrations} from "./spell-migrations.mjs";

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
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {string} mpCost.value
 * @property {string} target.value
 * @property {string} duration.value
 * @property {boolean} isOffensive.value
 * @property {string} opportunity
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 * @property {ItemAttributesDataModel} rollInfo.attributes
 * @property {number} rollInfo.accuracy.value
 * @property {DamageDataModel} rollInfo.damage
 * @property {boolean} hasRoll.value
 */
export class SpellDataModel extends foundry.abstract.TypeDataModel {
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
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(DamageDataModel, {}),
			impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			mpCost: new SchemaField({ value: new StringField() }),
			target: new SchemaField({ value: new StringField() }),
			duration: new SchemaField({ value: new StringField() }),
			isOffensive: new SchemaField({ value: new BooleanField() }),
			opportunity: new StringField(),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
				attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
				accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
				damage: new EmbeddedDataField(DamageDataModel, {}),
			}),
			hasRoll: new SchemaField({ value: new BooleanField() }),
		};
	}

    static migrateData(source) {
        SpellMigrations.run(source)
        return source;
    }
}
