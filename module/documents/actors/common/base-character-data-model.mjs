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
 * @property {EquipDataModel} equipped
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
	 * Adds a trackable resource to the clocks property of this DataModel
	 * @param {string} key - Key name for the clock to be added to the DataModel
	 * @param {string} fuid - fuid of the progress clock -- will be resolved with {@link FUActor.resolveProgress}
	 */
	addClockResource(key, fuid) {
		this.clocks ??= {};
		this.clocks[key] ??= {};

		const actor = this.parent;

		Object.defineProperty(this.clocks[key], 'value', {
			configurable: true,
			enumerable: true,
			get() {
				const clock = actor?.resolveProgress(fuid);
				if (!clock) return 0;
				return clock.current;
			},
		});

		Object.defineProperty(this.clocks[key], 'max', {
			configurable: true,
			enumerable: true,
			get() {
				const clock = actor?.resolveProgress(fuid);
				if (!clock) return 0;
				return clock.max;
			},
		});
	}

	/**
	 * @return FUActor
	 */
	get actor() {
		return this.parent;
	}
}
