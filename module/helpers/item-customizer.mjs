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

class CustomWeaponHandler extends ItemHandler {
	#hrZero = false;

	static supports(item) {
		return item?.type === 'customWeapon';
	}

	get comparisonTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-custom-weapon-comparison.hbs';
	}

	get configurationTemplate() {
		return 'systems/projectfu/templates/app/item-customizer/item-customizer-custom-weapon-config.hbs';
	}

	prepareComparison(context) {
		super.prepareComparison(context);
		context.workingCopy.hrZero = this.#hrZero;
	}

	prepareConfiguration(context) {
		super.prepareConfiguration(context);
		context.hrZero = this.#hrZero;
		if (this.item.system.isTransforming) {
			context.weaponForms = {
				primaryForm: this.item.system.primaryForm.name || game.i18n.localize('FU.CustomWeaponFormPrimary'),
				secondaryForm: this.item.system.secondaryForm.name || game.i18n.localize('FU.CustomWeaponFormSecondary'),
			};
		}
	}

	toggleHrZero(event, target) {
		this.#hrZero = target.checked;
	}

	roll() {
		this.workingCopy.roll({ shift: this.#hrZero });
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
	customWeapon: CustomWeaponHandler,
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
		this.#workingCopy = this.#createWorkingCopy(this.#item);

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
			context.item = this.#item;
			context.workingCopy = this.#workingCopy;
			context.template = this.#handler.comparisonTemplate;
			this.#handler.prepareComparison(context);
		}

		if (partId === 'config') {
			this.#handler.prepareConfiguration(context);
		}

		return super._preparePartContext(partId, context, options);
	}

	/**
	 * @override
	 */
	_onClickAction(event, target) {
		const action = target.dataset.action;

		if (typeof this.#handler[action] === 'function') {
			this.#handler[action](event, target);
			event.stopPropagation();
			event.preventDefault();
			this.render();
			return;
		}

		console.warn('Unhandled action:', target.dataset.action, event, target);
	}

	#createWorkingCopy(item) {
		return item.clone({}, { keepId: true });
	}

	static async #onModify() {
		await this.#item.update(this.#workingCopy.toObject(true));
		ui.notifications.info(`${this.#item.name} modified for ${this.#actor.name}`);
		this.close();
	}

	static async #onClone() {
		this.#workingCopy.updateSource({ _id: null, name: `${this.#workingCopy.name} (Modified)` });
		await Item.create(this.#workingCopy, { parent: this.#actor });

		ui.notifications.info(`${this.#item.name} cloned and added to ${this.#actor.name}`);
		this.close();
	}

	static #onRoll() {
		if (typeof this.#handler.roll === 'function') {
			this.#handler.roll();
		} else {
			this.#workingCopy.roll();
		}
		this.close();
	}

	static #onReset() {
		this.#workingCopy = this.#createWorkingCopy(this.#item);
		this.render();
	}

	static #onConfigFormSubmit(event, form, formData) {
		const data = foundry.utils.expandObject(formData.object);
		this.#workingCopy.updateSource(data);
		this.render();
	}
}
