import { FU } from './config.mjs';
import FUApplication from '../ui/application.mjs';
import { WeaponModuleDataModel } from '../documents/items/classFeature/pilot/weapon-module-data-model.mjs';

class ItemHandler {
	static supports(item) {
		return false;
	}

	/** @type {{actor: Actor, item: Item, workingCopy: object}} */
	#context;

	constructor(context) {
		this.#context = context;
	}

	get item() {
		return this.#context.item;
	}

	get workingCopy() {
		return this.#context.workingCopy;
	}

	/**
	 * Template for the comparisons in the comparison section ("top") of the customizer.
	 * Executed with either item or workingCopy as context.
	 * Data prepared by "prepareComparison" is available in the "@root" context.
	 */
	get comparisonTemplate() {
		throw new Error('ItemHandler subclasses must define comparisonTemplate');
	}

	/**
	 * @param {object} context
	 */
	prepareComparison(context) {
		context.FU = FU;
	}

	/**
	 * Template for the configuration section ("middle") of the customizer.
	 * Executed with the result of "prepareConfiguration" as context
	 */
	get configurationTemplate() {
		throw new Error('ItemHandler subclasses must define partTemplate');
	}

	/**
	 * @param {object} context
	 */
	prepareConfiguration(context) {
		context.FU = FU;
		context.system = this.workingCopy.system;
	}
}

class WeaponHandler extends ItemHandler {
	static supports(item) {
		return ['weapon', 'basic'].includes(item?.type);
	}

	get comparisonTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-weapon-comparison.hbs';
	}

	get configurationTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-weapon-config.hbs';
	}
}

class SpellHandler extends ItemHandler {
	static supports(item) {
		return item?.type === 'spell';
	}

	get comparisonTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-spell-comparison.hbs';
	}

	get configurationTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-spell-config.hbs';
	}
}

class WeaponModuleHandler extends ItemHandler {
	static supports(item) {
		return item?.type === 'classFeature' && item.system.data instanceof WeaponModuleDataModel && item.system.data.type !== 'shield';
	}

	get comparisonTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-weapon-module-comparison.hbs';
	}

	get configurationTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-weapon-module-config.hbs';
	}
}

/**
 * @type {Record<string, typeof ItemHandler>}
 */
const ITEM_HANDLERS = {
	weapon: WeaponHandler,
	basic: WeaponHandler,
	spell: SpellHandler,
	weaponModule: WeaponModuleHandler,
};

export class ItemCustomizer extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		id: 'item-customizer',
		window: { title: 'FU.ItemCustomizer' },
		classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
		position: { width: 440 },
		form: {
			closeOnSubmit: false,
		},
		actions: {
			modify: ItemCustomizer.#onModify,
			clone: ItemCustomizer.#onClone,
			roll: ItemCustomizer.#onRoll,
			reset: ItemCustomizer.#onReset,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		comparison: {
			template: 'systems/projectfu/templates/app/item-customizer/item-customizer-comparison.hbs',
		},
		config: {
			// dynamically configured based on item type, see _configureRenderParts,
			forms: {
				form: {
					closeOnSubmit: false,
					submitOnChange: true,
					handler: ItemCustomizer.#onConfigFormSubmit,
				},
			},
		},
		buttons: {
			template: 'systems/projectfu/templates/app/item-customizer/item-customizer-buttons.hbs',
		},
	};

	/** @type Actor */
	#actor;

	/** @type Item */
	#item;

	/** @type object */
	#workingCopy;

	/** @type ItemHandler */
	#handler;

	constructor(actor, item, options = {}) {
		super(options);
		this.#actor = actor;
		if (!this.#actor) {
			ui.notifications.error('No actor');
			throw new Error('No actor');
		}

		this.#item = item;
		if (!this.#item) {
			ui.notifications.error('No item');
			throw new Error('No item');
		}
		this.#workingCopy = item.toObject(false);

		const HandlerConstructor = Object.values(ITEM_HANDLERS)
			.filter((handler) => handler.supports(item))
			.at(0);
		if (HandlerConstructor) {
			const handlerContext = {};
			Object.defineProperty(handlerContext, 'actor', { get: () => this.#actor });
			Object.defineProperty(handlerContext, 'item', { get: () => this.#item });
			Object.defineProperty(handlerContext, 'workingCopy', { get: () => this.#workingCopy });

			this.#handler = new HandlerConstructor(handlerContext);
		} else {
			ui.notifications.error('Unsupported item');
			throw new Error('Unsupported item');
		}
	}

	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);
		parts.comparison.templates.push(this.#handler.comparisonTemplate);
		parts.config.template = this.#handler.configurationTemplate;
		return parts;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		this.#handler.prepareConfiguration(context);
		return context;
	}

	async _preparePartContext(partId, context, options) {
		context = { ...context };

		if (partId === 'comparison') {
			this.#handler.prepareComparison(context);
			context.item = this.#item;
			context.workingCopy = this.#workingCopy;
			context.template = this.#handler.comparisonTemplate;
		}

		if (partId === 'config') {
			this.#handler.prepareConfiguration(context);
		}

		return super._preparePartContext(partId, context, options);
	}

	static async #onModify() {
		await this.#item.update(this.#workingCopy);
		ui.notifications.info(`${this.#item.name} modified for ${this.#actor.name}`);
		this.close();
	}

	static async #onClone() {
		const newItemData = foundry.utils.deepClone(this.#workingCopy);
		newItemData.name = `${newItemData.name} (Modified)`;
		await Item.create(newItemData, { parent: this.#actor });

		ui.notifications.info(`${this.#item.name} cloned and added to ${this.#actor.name}`);
		this.close();
	}

	static #onRoll() {
		const clonedItem = this.#item.clone(this.#workingCopy, { keepId: true });
		clonedItem.roll();
		this.close();
	}

	static #onReset() {
		this.#workingCopy = this.#item.toObject(false);
		this.render();
	}

	static #onConfigFormSubmit(event, form, formData) {
		const data = foundry.utils.expandObject(formData.object);
		foundry.utils.mergeObject(this.#workingCopy, data);
		this.render();
	}
}
