import { IngredientDataModel, tasteComparator, TASTES } from './ingredient-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';

const ALL_YOU_CAN_EAT_FLAG = 'AllYouCanEat';

/**
 * @typedef Recipe
 * @property {string[]} ingredients
 */

/**
 * @property {Recipe} object
 */
export class CookingApplication extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['form', 'projectfu', 'cooking-app'],
			width: 550,
			height: 'auto',
			closeOnSubmit: false,
			editable: true,
			sheetConfig: false,
			submitOnChange: true,
			submitOnClose: true,
			minimizable: false,
			title: 'FU.ClassFeatureCookbookCookingTitle',
		});
	}

	/**
	 * @type CookbookDataModel
	 */
	#cookbook;

	constructor(cookbook) {
		if (cookbook.app) {
			return cookbook.app;
		}
		const maxIngredients = cookbook.actor.getFlag(SYSTEM, ALL_YOU_CAN_EAT_FLAG) ? 4 : 3;
		super({ ingredients: Array(maxIngredients).fill('') });
		this.#cookbook = cookbook;
		cookbook.app = this;
	}

	get template() {
		return 'systems/projectfu/templates/feature/gourmet/cooking-application.hbs';
	}

	async getData(options = {}) {
		/** @type {Record<string, FUItem>} */
		const ingredients = this.#cookbook.actor.itemTypes.classFeature.filter((value) => value.system.data instanceof IngredientDataModel && value.system.data.quantity > 0).reduce((agg, val) => (agg[val.id] = val) && agg, {});

		const tastes = this.object.ingredients
			.map((value) => ingredients[value])
			.filter((value) => !!value)
			.map((value) => value.system.data.taste)
			.sort(tasteComparator);

		const combinations = [];

		for (let i = 0; i < tastes.length - 1; i++) {
			for (let j = i + 1; j < tastes.length; j++) {
				let firstTaste = tastes[i];
				let secondTaste = tastes[j];
				if (!combinations.some(([t1, t2]) => t1 === firstTaste && t2 === secondTaste)) {
					combinations.push([firstTaste, secondTaste]);
				}
			}
		}

		const effects = await Promise.all(
			combinations
				.map(([taste1, taste2]) => this.#cookbook.getCombination(taste1, taste2))
				.map(async (value) => ({
					taste1: {
						value: value.taste1,
						label: TASTES[value.taste1],
					},
					taste2: {
						value: value.taste2,
						label: TASTES[value.taste2],
					},
					effect: await TextEditor.enrichHTML(value.effect),
				})),
		);

		const usedIngredients = this.object.ingredients.reduce((acc, value, idx) => (acc[value] = (acc[value] ?? 0) + 1) && acc, {});
		const selectOptions = this.object.ingredients.map((value) =>
			Object.entries(ingredients)
				.filter(([id, item]) => value === id || (item.system.data.quantity ?? 0) - (usedIngredients[id] ?? 0) > 0)
				.map(([id, item]) => ({
					value: id,
					label: `${item.name} (${game.i18n.localize(TASTES[item.system.data.taste])})`,
				})),
		);

		return {
			recipe: this.object,
			ingredients: ingredients,
			effects: effects,
			options: selectOptions,
		};
	}

	async close(options = {}) {
		await super.close(options);
		delete this.#cookbook.app;
		if (options.getCooking) {
			return this.#startCooking();
		}
	}

	async #startCooking() {
		const data = await this.getData();
		const updates = [];

		const renderData = {
			ingredients: data.recipe.ingredients.map((id) => data.ingredients[id]).filter((value) => !!value),
			effects: data.effects,
		};

		/**
		 * @type FUActor
		 */
		const actor = this.#cookbook.actor;

		// Decrement quantity of ingredients
		const usedIngredients = renderData.ingredients.reduce((acc, value, idx) => (acc[value.id] = (acc[value.id] ?? 0) + 1) && acc, {});
		const ingredientUpdates = Object.keys(usedIngredients).map((id) => {
			return {
				_id: id,
				'system.data.quantity': Math.max((data.ingredients[id].system.data.quantity ?? 0) - usedIngredients[id], 0),
			};
		});
		updates.push(actor.updateEmbeddedDocuments('Item', ingredientUpdates));

		/**
		 * @type ChatMessageData
		 */
		const messageData = {
			speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
			content: await renderTemplate('systems/projectfu/templates/feature/gourmet/cooking-chat-message.hbs', renderData),
		};

		updates.unshift(ChatMessage.create(messageData));

		return Promise.all(updates);
	}

	async _updateObject(event, formData) {
		formData = foundry.utils.expandObject(formData);
		this.object.ingredients = Array.from(Object.values(formData.ingredients));
		this.render();
	}

	activateListeners(html) {
		html.find('[data-action=startCooking]').click(() => this.close({ getCooking: true }));
		return super.activateListeners(html);
	}
}
