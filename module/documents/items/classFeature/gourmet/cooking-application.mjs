import { getTasteAliasFlag, IngredientDataModel, tasteComparator, TASTES } from './ingredient-data-model.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import FUApplication from '../../../../ui/application.mjs';

const FLAG_ALL_YOU_CAN_EAT = 'allYouCanEat';

export class CookingApplication extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		window: { title: 'FU.ClassFeatureCookbookCookingTitle', minimizable: false },
		classes: ['form', 'projectfu', 'cooking-app', 'backgroundstyle'],
		position: {
			width: 550,
		},
		tag: 'form',
		form: {
			closeOnSubmit: false,
			submitOnChange: true,
			handler: CookingApplication.#onFormSubmit,
		},
		actions: {
			startCooking: CookingApplication.#startCooking,
		},
	};

	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/feature/gourmet/cooking-application.hbs',
		},
	};

	/**
	 * @type CookbookDataModel
	 */
	#cookbook;

	/**
	 * @type {string[]}
	 */
	#recipe;

	constructor(cookbook) {
		super();
		if (cookbook.app) {
			return cookbook.app;
		}
		const maxIngredients = cookbook.actor.getFlag(SYSTEM, FLAG_ALL_YOU_CAN_EAT) ? 4 : 3;
		this.#recipe = Array(maxIngredients).fill('');
		this.#cookbook = cookbook;
		cookbook.app = this;
	}

	async _prepareContext(options = {}) {
		const context = await super._prepareContext(options);
		const data = await this.getData();
		Object.assign(context, data);
		return context;
	}

	async getData() {
		/** @type {Record<string, FUItem>} */
		const ingredients = this.#cookbook.actor.itemTypes.classFeature.filter((value) => value.system.data instanceof IngredientDataModel && value.system.data.quantity > 0).reduce((agg, val) => (agg[val.id] = val) && agg, {});

		const tastes = this.#recipe
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

		const tastesWithAliases = { ...TASTES };
		if (this.#cookbook.actor) {
			for (const taste of Object.keys(tastesWithAliases)) {
				tastesWithAliases[taste] = this.#cookbook.actor.getFlag(SYSTEM, getTasteAliasFlag(taste)) || TASTES[taste];
			}
		}

		const effects = await Promise.all(
			combinations
				.map(([taste1, taste2]) => this.#cookbook.getCombination(taste1, taste2))
				.map(async (value) => ({
					taste1: {
						value: value.taste1,
						label: tastesWithAliases[value.taste1],
					},
					taste2: {
						value: value.taste2,
						label: tastesWithAliases[value.taste2],
					},
					effect: await TextEditor.enrichHTML(value.effect),
				})),
		);

		const usedIngredients = this.#recipe.reduce((acc, value, idx) => (acc[value] = (acc[value] ?? 0) + 1) && acc, {});
		const selectOptions = this.#recipe.map((value) =>
			Object.entries(ingredients)
				.filter(([id, item]) => value === id || (item.system.data.quantity ?? 0) - (usedIngredients[id] ?? 0) > 0)
				.map(([id, item]) => ({
					value: id,
					label: `${item.name} (${game.i18n.localize(tastesWithAliases[item.system.data.taste])})`,
				})),
		);

		return {
			recipe: this.#recipe,
			ingredients: ingredients,
			effects: effects,
			options: selectOptions,
		};
	}

	async close(options = {}) {
		await super.close(options);
		delete this.#cookbook.app;
	}

	static async #startCooking() {
		const data = await this.getData();
		const updates = [this.close()];

		const renderData = {
			ingredients: data.recipe.map((id) => data.ingredients[id]).filter((value) => !!value),
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

		updates.unshift(
			Checks.display(actor, this.#cookbook.item, (check) => {
				check.additionalData['action'] = 'cooking';
				check.additionalData['cooking'] = renderData;
			}),
		);

		return Promise.all(updates);
	}

	static async #onFormSubmit(event, form, formData) {
		for (let i = 0; i < this.#recipe.length; i++) {
			this.#recipe[i] = formData.get(`ingredients.${i}`);
		}
		this.render();
	}
}
