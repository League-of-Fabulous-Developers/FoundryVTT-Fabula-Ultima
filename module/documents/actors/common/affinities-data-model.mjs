import { AffinityDataModel } from './affinity-data-model.mjs';
import {FU} from "../../../helpers/config.mjs";

/**
 * @property {AffinityDataModel} phys
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

	handleGuard() {
		const actor = this.parent.actor;
		if (actor.statuses.has('guard')) {
			Object.values(this).forEach((value) => {
				if (value.current <= FU.affValue.none) {
					value.upgrade();
				}
			});
		}
	}
}
