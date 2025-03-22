/**
 * @typedef Taste
 * @type {"bitter","salty","sour","sweet","umami"}
 */
import { ClassFeatureDataModel } from '../class-feature-data-model.mjs';

export const TASTES = Object.freeze({
	bitter: 'FU.ClassFeatureIngredientTasteBitter',
	salty: 'FU.ClassFeatureIngredientTasteSalty',
	sour: 'FU.ClassFeatureIngredientTasteSour',
	sweet: 'FU.ClassFeatureIngredientTasteSweet',
	umami: 'FU.ClassFeatureIngredientTasteUmami',
});

const TASTE_ARRAY = Object.keys(TASTES);

/**
 * @param {Taste} taste1
 * @param {Taste} taste2
 */
export function tasteComparator(taste1, taste2) {
	return TASTE_ARRAY.indexOf(taste1) - TASTE_ARRAY.indexOf(taste2);
}

/**
 * @property {Taste} taste
 * @property {number} quantity
 * @property {string} description
 */
export class IngredientDataModel extends ClassFeatureDataModel {
	static defineSchema() {
		const { StringField, NumberField, HTMLField } = foundry.data.fields;
		return {
			taste: new StringField({ initial: 'bitter', choices: TASTE_ARRAY }),
			cost: new NumberField({ intial: 0, min: 0, integer: true }),
			quantity: new NumberField({ initial: 1, min: 0, integer: true }),
			description: new HTMLField(),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/gourmet/ingredient-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/gourmet/ingredient-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureIngredient';
	}

	static async getAdditionalData(model) {
		return {
			tastes: TASTES,
			enrichedDescription: await TextEditor.enrichHTML(model.description),
		};
	}

	onActorDrop(actor) {
		const similarIngredient = actor.itemTypes.classFeature.find((item) => item.system.featureType === this.parent.featureType && item.name === this.item.name && item.system.data.taste === this.taste);
		if (similarIngredient) {
			similarIngredient.update({ 'system.data.quantity': similarIngredient.system.data.quantity + this.quantity });
			return false;
		}
	}
}
