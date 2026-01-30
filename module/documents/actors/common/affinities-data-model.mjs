import { FU } from '../../../helpers/config.mjs';
import { AffinityDataModel } from './affinity-data-model.mjs';

/**
 * @property {AffinityDataModel} physical
 * @property {AffinityDataModel} air
 * @property {AffinityDataModel} bolt
 * @property {AffinityDataModel} dark
 * @property {AffinityDataModel} earth
 * @property {AffinityDataModel} fire
 * @property {AffinityDataModel} ice
 * @property {AffinityDataModel} light
 * @property {AffinityDataModel} poison
 */
export class AffinitiesDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { EmbeddedDataField } = foundry.data.fields;
		return {
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
	}

	/**
	 * Handles resolving multiple affinity types, such as damage types or weapon categories
	 * @param  {...(AffinityDataModel | string)} affinities - A set of {@link AffinityDataModel}s or strings representing keys from {@link FU.affValue} to reconcile
	 * @returns {number} - Numeric representation of the final affinity
	 */
	resolveMultipleAffinities(...affinities) {
		const dataModels = affinities.map((aff) => (aff instanceof AffinityDataModel ? aff : typeof aff === 'string' ? this[aff] : undefined)).filter((aff) => !!aff);

		// If any are IM or AB, then return IM or AB
		if (dataModels.some((affinity) => affinity.current === FU.affValue.immunity)) return FU.affValue.immunity;
		if (dataModels.some((affinity) => affinity.current === FU.affValue.absorption)) return FU.affValue.absorption;

		const hasRes = dataModels.some((model) => model.current === FU.affValue.resistance);
		const hasVuln = dataModels.some((model) => model.current === FU.affValue.vulnerability);

		if (hasRes && !hasVuln) return FU.affValue.resistance;
		if (hasVuln && !hasRes) return FU.affValue.vulnerability;
		return FU.affValue.none;
	}

	/** @returns {Record<string, AffinityDataModel>} */
	get all() {
		return {
			physical: this.physical,
			air: this.air,
			bolt: this.bolt,
			dark: this.dark,
			earth: this.earth,
			fire: this.fire,
			ice: this.ice,
			light: this.light,
			poison: this.poison,
		};
	}
}
