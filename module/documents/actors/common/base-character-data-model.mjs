import { AffinitiesDataModel } from './affinities-data-model.mjs';
import { AttributesDataModel } from './attributes-data-model.mjs';
import { DerivedValuesDataModel } from './derived-values-data-model.mjs';
import { EquipDataModel } from './equip-data-model.mjs';
import { BonusesDataModel, MultipliersDataModel } from './bonuses-data-model.mjs';
import { ImmunitiesDataModel } from './immunities-data-model.mjs';
import { OverridesDataModel } from './overrides-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @class
 * @property {AffinitiesDataModel} affinities
 * @property {AttributesDataModel} attributes
 * @property {DerivedValuesDataModel} derived
 * @property {BonusesDataModel} bonuses Flat amounts
 * @property {BonusesDataModel} multipliers Multiplies the base amount
 * @property {OverridesDataModel} overrides Overrides for default behaviour
 * @property {string} description
 */
export class BaseCharacterDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			affinities: new fields.EmbeddedDataField(AffinitiesDataModel, {}),
			attributes: new fields.EmbeddedDataField(AttributesDataModel, {}),
			derived: new fields.EmbeddedDataField(DerivedValuesDataModel, {}),
			equipped: new fields.EmbeddedDataField(EquipDataModel, {}),
			bonuses: new fields.EmbeddedDataField(BonusesDataModel, {}),
			multipliers: new fields.EmbeddedDataField(MultipliersDataModel, {}),
			overrides: new fields.EmbeddedDataField(OverridesDataModel, {}),
			immunities: new fields.EmbeddedDataField(ImmunitiesDataModel, {}),
			description: new fields.HTMLField(),
		};
	}

	/**
	 * @return FUActor
	 */
	get actor() {
		return this.parent;
	}
}
