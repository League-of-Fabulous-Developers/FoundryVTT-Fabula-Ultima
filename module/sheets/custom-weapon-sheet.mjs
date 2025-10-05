import { FU, SYSTEM } from '../helpers/config.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { FUItemSheet } from './item-sheet.mjs';
import { Traits } from '../pipelines/traits.mjs';
import { SETTINGS } from '../settings.js';
import { getTechnosphereSlotInfo } from '../helpers/technospheres.mjs';
import { PseudoItem } from '../documents/items/pseudo-item.mjs';
import { MnemosphereDataModel } from '../documents/items/mnemosphere/mnemosphere-data-model.mjs';
import { HoplosphereDataModel } from '../documents/items/hoplosphere/hoplosphere-data-model.mjs';

export class CustomWeaponSheet extends FUItemSheet {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			debug: CustomWeaponSheet.#printDebug,
			edit: CustomWeaponSheet.#editNested,
			delete: CustomWeaponSheet.#removeNested,
			roll: CustomWeaponSheet.#onItemRoll,
		},
		window: {
			controls: [
				{
					icon: 'fa-bug',
					label: 'Print debug info',
					action: 'debug',
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		classes: [],
		position: {
			width: 700,
		},
		dragDrop: [
			{
				dragSelector: null,
				dropSelector: '.technosphere-slots__slot--empty',
				permissions: {
					drop: CustomWeaponSheet.#canSlotTechnospheres,
				},
				callbacks: { drop: CustomWeaponSheet.#onTechnosphereDrop },
			},
		],
	};

	static PARTS = {
		...super.PARTS,
		description: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-description.hbs',
		},
		attributes: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-attributes.hbs',
		},
	};

	/** @type {Record<string, ApplicationTabsConfiguration>} */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'description', label: 'FU.Description', icon: 'ra ra-double-team' },
				{ id: 'attributes', label: 'FU.Attributes', icon: 'ra ra-hand' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' },
			],
			initial: 'description',
		},
		form: {
			tabs: [{ id: 'primaryForm' }, { id: 'secondaryForm' }],
			initial: 'primaryForm',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	/**
	 * @param {Event} event
	 * @param {HTMLElement} element
	 */
	static #editNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).sheet.render({ force: true });
	}

	static #removeNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		const promises = [];
		const item = this.item.system.items.get(id);
		if (item.actor && (item.system instanceof MnemosphereDataModel || item.system instanceof HoplosphereDataModel)) {
			const itemObject = item.toObject(true);
			promises.push(this.item.actor.createEmbeddedDocuments('Item', [itemObject]));
		}
		promises.push(item.delete());
		return Promise.all(promises);
	}

	static #onItemRoll(event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		const item = this.item.system.items.get(itemId);
		if (item) {
			item.roll();
		}
	}

	static #canSlotTechnospheres() {
		return this.isEditable;
	}

	static async #onTechnosphereDrop(event) {
		const data = TextEditor.getDragEventData(event);
		if (data.type === 'Item') {
			const item = await fromUuid(data.uuid);

			if (['mnemosphere', 'hoplosphere'].includes(item.type)) {
				const promises = [];
				promises.push(this.item.system.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]));
				if (item.isEmbedded) {
					promises.push(item.delete());
				}
				return Promise.all(promises);
			} else {
				ui.notifications.error('Only Technospheres can be slotted in this item.');
			}
		}
	}

	constructor(options = {}) {
		super(options);
		this.tabGroups.form = this.item.system.activeForm;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		const flattenedOverrides = foundry.utils.flattenObject(this.item.system.computedPropertiesSetByActiveEffect);
		Array.from(this.element.querySelectorAll('input[name], textarea[name], button[name], select[name]'))
			.filter((element) => element.name in flattenedOverrides)
			.forEach((element) => this.disableElement(element));
	}

	async _prepareContext(options) {
		if (!this.item.system.isTransforming) {
			this.tabGroups.form = 'primaryForm';
		}

		const context = await super._prepareContext(options);

		const technosphereMode = game.settings.get(SYSTEM, SETTINGS.technospheres);
		const description = await TextEditor.enrichHTML(this.item.system.description);

		context.item = this.item;
		context.system = this.item.system;
		context.enrichedHtml = {
			description,
		};
		context.FU = FU;
		context.technosphereMode = technosphereMode;
		context.tabs = this._prepareTabs('primary');
		context.formTabs = this._prepareTabs('form');

		context.traits = Object.keys(Traits).map((key) => ({
			label: key,
			value: key,
		}));

		if (technosphereMode) {
			context.slots = this.#createSlotArray();
		}

		return context;
	}

	#createSlotArray() {
		const { mnemosphereSlots, slotted, slotCount } = this.item.system;
		return getTechnosphereSlotInfo(slotted, slotCount, mnemosphereSlots);
	}

	async _preparePartContext(partId, context, options) {
		context = await super._preparePartContext(partId, context, options);
		return context;
	}

	_prepareSubmitData(event, form, formData, updateData) {
		const submitData = super._prepareSubmitData(event, form, formData, updateData);
		const overriddenKeys = Object.keys(foundry.utils.flattenObject(this.item.system.computedPropertiesSetByActiveEffect));
		overriddenKeys.forEach((key) => foundry.utils.deleteProperty(submitData, key));

		if (submitData?.system?.activeForm !== this.item.system.activeForm) {
			this.tabGroups.form = submitData.system.activeForm;
		}

		return submitData;
	}
}
