import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

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
 * @extends RollableClassFeatureDataModel
 * @property {"exoskeleton","mech","steed"} frame
 * @property {number} passengers
 * @property {number} distanceMultiplier
 * @property {number} moduleSlots
 * @property {string} description
 */
export class VehicleDataModel extends RollableClassFeatureDataModel {
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

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
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

	static async roll(model, item) {
		const actor = model.parent.parent.actor;
		if (!actor) {
			return;
		}

		// Localize the frame name
		const localizedFrame = game.i18n.localize(frames[model.frame]);

		const data = {
			frame: localizedFrame,
			moduleSlots: model.moduleSlots,
			passengers: model.passengers,
			distanceMultiplier: model.distanceMultiplier,
			description: await TextEditor.enrichHTML(model.description),
		};

		const speaker = ChatMessage.implementation.getSpeaker({ actor: actor });
		const chatMessage = {
			speaker,
			flavor: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-item.hbs', model.parent.parent),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/pilot/feature-vehicle-frame-chat-message.hbs', data),
			flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
		};

		ChatMessage.create(chatMessage);
	}

	transferEffects() {
		let vehicleState = this.actor?.system.vehicle;
		return vehicleState?.vehicle === this.item && vehicleState?.embarked;
	}
}
