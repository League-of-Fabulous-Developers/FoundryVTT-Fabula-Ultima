import {IsEquippedDataModel} from '../common/is-equipped-data-model.mjs';
import {UseWeaponDataModel} from '../common/use-weapon-data-model.mjs';
import {ItemAttributesDataModel} from '../common/item-attributes-data-model.mjs';
import {DamageDataModel} from '../common/damage-data-model.mjs';
import {ImprovisedDamageDataModel} from '../common/improvised-damage-data-model.mjs';
import {ProgressDataModel} from '../common/progress-data-model.mjs';
import {MiscAbilityMigrations} from './misc-ability-migrations.mjs';

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {boolean} isMartial.value
 * @property {string} opportunity
 * @property {IsEquippedDataModel} isEquipped
 * @property {UseWeaponDataModel} useWeapon
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {DamageDataModel} damage
 * @property {ImprovisedDamageDataModel} impdamage
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {boolean} hasClock.value
 * @property {boolean} hasResource.value
 * @property {ProgressDataModel} progress
 * @property {string} source.value
 * @property {UseWeaponDataModel} rollInfo.useWeapon
 * @property {ItemAttributesDataModel} rollInfo.attributes
 * @property {number} rollInfo.accuracy.value
 * @property {DamageDataModel} rollInfo.damage
 * @property {boolean} isOffensive.value
 * @property {boolean} hasRoll.value
 */
export class MiscAbilityDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField, EmbeddedDataField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			opportunity: new StringField(),
			// isEquipped: new EmbeddedDataField(IsEquippedDataModel, {}),
			useWeapon: new EmbeddedDataField(UseWeaponDataModel, {}),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'dex' }, secondary: { value: 'ins' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			damage: new EmbeddedDataField(DamageDataModel, {}),
			impdamage: new EmbeddedDataField(ImprovisedDamageDataModel, {}),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			hasClock: new SchemaField({ value: new BooleanField() }),
			hasResource: new SchemaField({ value: new BooleanField() }),
			progress: new EmbeddedDataField(ProgressDataModel, {}),
			rp: new EmbeddedDataField(ProgressDataModel, {}),
			source: new SchemaField({ value: new StringField() }),
			rollInfo: new SchemaField({
				useWeapon: new EmbeddedDataField(UseWeaponDataModel, {}),
				attributes: new EmbeddedDataField(ItemAttributesDataModel, {}),
				accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: true }) }),
				damage: new EmbeddedDataField(DamageDataModel, {}),
			}),
			hasRoll: new SchemaField({ value: new BooleanField() }),
		};
	}

	static migrateData(source) {
		MiscAbilityMigrations.run(source);
		return source;
	}
}
