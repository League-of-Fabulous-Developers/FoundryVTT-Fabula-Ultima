import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

/**
 * Available frame types and their translation keys
 * @type {{exoskeleton: string, steed: string, mech: string}}
 */
const frames = {
	exoskeleton: 'FU.ClassFeatureVehicleFrameExoskeleton',
	mech: 'FU.ClassFeatureVehicleFrameMech',
	steed: 'FU.ClassFeatureVehicleFrameSteed',
};

/**
 * @extends ClassFeatureDataModel
 * @property {"exoskeleton","mech","steed"} frame
 * @property {number} passengers
 * @property {number} distanceMultiplier
 * @property {number} moduleSlots
 * @property {string} description
 */
export class VehicleDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, NumberField, HTMLField } = foundry.data.fields;
		return {
			frame: new StringField({ initial: 'exoskeleton', choices: Object.keys(frames) }),
			passengers: new NumberField({ initial: 0, min: 0 }),
			distanceMultiplier: new NumberField({ initial: 1, min: 1 }),
			moduleSlots: new NumberField({ initial: 3, min: 3 }),
			description: new HTMLField(),
		};
	}

	static get translation() {
		return 'FU.ClassFeatureVehicle';
	}

	static get template() {
		return 'systems/projectfu/templates/feature/pilot/vehicle-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/pilot/vehicle-preview.hbs';
	}

	static getAdditionalData(model) {
		return {
			frames,
			active: model.item === model.actor?.system.vehicle.vehicle,
		};
	}

	/**
	 * How many weapon slots does this vehicle have?
	 */
	get weaponSlots() {
		return this.frame === 'steed' ? 1 : 2;
	}
}
