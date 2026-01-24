import { FU } from '../../../helpers/config.mjs';
import { AffinitiesDataModel } from './affinities-data-model.mjs';
import { AffinityDataModel } from './affinity-data-model.mjs';

export class CategoryAffinityDataModel extends AffinitiesDataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		const schema = {
			physical: new EmbeddedDataField(AffinityDataModel, {}),
			air: new EmbeddedDataField(AffinityDataModel, {}),
			bolt: new EmbeddedDataField(AffinityDataModel, {}),
			dark: new EmbeddedDataField(AffinityDataModel, {}),
			earth: new EmbeddedDataField(AffinityDataModel, {}),
			fire: new EmbeddedDataField(AffinityDataModel, {}),
			ice: new EmbeddedDataField(AffinityDataModel, {}),
			light: new EmbeddedDataField(AffinityDataModel, {}),
			poison: new EmbeddedDataField(AffinityDataModel, {}),
		};

		for (const category of Object.keys(FU.weaponCategories)) {
			schema[category] = new EmbeddedDataField(AffinityDataModel, {});
		}

		return schema;
	}

	/** @returns {Record<string, AffinityDataModel>} */
	get all() {
		const affinities = super.all;

		for (const category of FU.weaponCategories) {
			affinities[category] = this[category];
		}

		return affinities;
	}
}
