import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';

/**
 * @extends ClassFeatureDataModel
 * @property {string} description
 */
export class TherioformDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { HTMLField } = foundry.data.fields;
		return {
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/mutant/therioform-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/mutant/feature-therioform-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureTherioformLabel';
	}

	static async getAdditionalData(model) {
		// Extract the ID from model.item
		const itemId = model.item?._id;

		// Check if ID is in array of equipped therioforms
		const activeTherioform = model.actor?.system.equipped.therioforms?.includes(itemId) || false;

		// Provide any additional data needed for the template rendering
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			active: activeTherioform,
		};
	}

	transferEffects() {
		return this.actor.system.equipped.therioforms?.includes(this.item.id) || false;
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	toggleActiveTherioform(event, target) {
		const itemId = this.item.id;
		let currentTherioformIds = this.actor.system.equipped.therioforms;

		// We want to toggle active ones to be removed and non-active ones to be added
		if (currentTherioformIds.includes(itemId)) {
			// Remove all instances of that id from the current therioforms
			currentTherioformIds = currentTherioformIds.filter((id) => id !== itemId);
		} else {
			// Add the id to the current therioforms
			currentTherioformIds.push(itemId);
		}

		this.actor.update({
			'system.equipped.therioforms': currentTherioformIds,
		});
	}
}
