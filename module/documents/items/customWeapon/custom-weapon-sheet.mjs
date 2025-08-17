import { editImageFile } from '../../../helpers/image-file-picker.mjs';
import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { Effects, prepareActiveEffectCategories } from '../../../pipelines/effects.mjs';
import { SETTINGS } from '../../../settings.js';
import { MnemosphereDataModel } from '../mnemosphere/mnemosphere-data-model.mjs';
import { HoplosphereDataModel } from '../hoplosphere/hoplosphere-data-model.mjs';

export class CustomWeaponSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			edit: CustomWeaponSheet.#editNested,
			delete: CustomWeaponSheet.#removeNested,
			debug: CustomWeaponSheet.#printDebug,
			editImage: CustomWeaponSheet.#onEditImage,
			roll: CustomWeaponSheet.#onItemRoll,
			changeForm: CustomWeaponSheet.#onChangeForm,
			effect: CustomWeaponSheet.#onEffectAction,
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
		classes: ['custom-weapon-sheet'],
		dragDrop: [
			{
				dragSelector: null,
				dropSelector: '.slot.empty-slot',
				permissions: {},
				callbacks: { drop: CustomWeaponSheet.#addNested },
			},
		],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-header.hbs',
		},
		navigation: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-navigation.hbs',
		},
		description: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-description.hbs',
		},
		attributes: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-attributes.hbs',
		},
		effects: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-effects.hbs',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	static async #addNested(event) {
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

	static async #onEditImage(_event, element) {
		await editImageFile(this, element);
	}

	static #onItemRoll(event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		const item = this.item.system.items.get(itemId);
		if (item) {
			item.roll();
		}
	}

	static #onChangeForm() {
		const newForm = this.item.system.activeForm === 'primaryForm' ? 'secondaryForm' : 'primaryForm';
		this.item.update({
			'system.activeForm': newForm,
		});
		this.tabGroups.form = newForm;
	}

	static async #onEffectAction(event, element) {
		const effectAction = element.closest('[data-effect-action]').dataset.effectAction;

		switch (effectAction) {
			case 'create': {
				const effectType = element.closest('[data-effect-type]').dataset.effectType;
				return Effects.createTemporaryEffect(this.document, effectType);
			}
			case 'edit': {
				const effectUuid = element.closest('[data-effect-id][data-uuid]').dataset.uuid;
				const effect = fromUuidSync(effectUuid);
				effect.sheet.render(true, { editable: this.document === effect.parent });
			}
		}
	}

	tabGroups = {
		main: 'description',
		form: 'primaryForm',
	};

	#dragDrop;

	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
		this.tabGroups.form = this.item.system.activeForm;
	}

	/**
	 * Create drag-and-drop workflow handlers for this Application
	 * @returns {DragDrop[]}     An array of DragDrop handlers
	 * @private
	 */
	#createDragDropHandlers() {
		return this.options.dragDrop.map((d) => {
			d.permissions = {};
			d.callbacks = Object.fromEntries(Object.entries(d.callbacks).map(([k, v]) => [k, v.bind(this)]));
			return new DragDrop(d);
		});
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		if (!this.item.system.isTransforming) {
			this.tabGroups.form = 'primaryForm';
		}
		Object.entries(this.tabGroups).forEach(([group, tab]) => this.changeTab(tab, group, { force: true }));
		this.#dragDrop.forEach((d) => d.bind(this.element));

		const flattenedOverrides = foundry.utils.flattenObject(this.document.overrides);
		Array.from(this.element.querySelectorAll('input[name], textarea[name], button[name], select[name]'))
			.filter((element) => element.name in flattenedOverrides)
			.forEach((element) => {
				if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
					element.readOnly = true;
				} else {
					element.disabled = true;
				}
				element.parentElement.dataset.tooltip = 'Overridden by active effect';
			});
	}

	async _prepareContext() {
		const technosphereMode = game.settings.get(SYSTEM, SETTINGS.technospheres);
		const description = await TextEditor.enrichHTML(this.item.system.description);

		const context = {
			item: this.item,
			system: this.item.system,
			enrichedHtml: {
				description,
			},
			FU,
			technosphereMode,
		};

		if (technosphereMode) {
			context.slots = this.#createSlotArray();
		}

		return context;
	}

	#createSlotArray() {
		const items = this.item.system.slotted;

		const slots = [];

		const usedSlots = items.reduce((previousValue, currentValue) => previousValue + (currentValue.system instanceof HoplosphereDataModel ? currentValue.system.requiredSlots : 1), 0);
		const itemSlots = this.item.system.slotCount;
		let unusedSlots = itemSlots;
		const totalMnemosphereSlots = this.item.system.mnemosphereSlots;
		let unusedMnemosphereSlots = totalMnemosphereSlots;
		const totalSlots = Math.max(usedSlots, itemSlots);

		for (let itemIdx = 0, slotIdx = 0; slotIdx < totalSlots; itemIdx++, slotIdx++, unusedSlots--) {
			const currentItem = items[itemIdx];
			const currentSlot = {
				item: currentItem,
				type: 'hoplosphere',
			};
			slots[slotIdx] = currentSlot;

			if (currentItem?.system instanceof MnemosphereDataModel) {
				currentSlot.overCapacity = slotIdx >= totalMnemosphereSlots;
				currentSlot.type = 'mnemosphere';
				unusedMnemosphereSlots--;
			} else if (currentItem?.system instanceof HoplosphereDataModel) {
				currentSlot.overCapacity = slotIdx >= itemSlots;

				if (currentItem.system.requiredSlots === 2) {
					slotIdx++;
					const occupiedSlot = (slots[slotIdx] = {
						type: 'hoplosphere',
						occupied: true,
						overCapacity: slotIdx >= itemSlots,
					});
					currentSlot.overCapacity = occupiedSlot.overCapacity;
				}
			}

			if (unusedMnemosphereSlots && (!currentSlot.item || unusedSlots === unusedMnemosphereSlots)) {
				currentSlot.type = 'mnemosphere';
				unusedMnemosphereSlots--;
			}
		}

		return slots;
	}

	async _preparePartContext(partId, context, options) {
		context = await super._preparePartContext(partId, context, options);
		if (partId === 'effects') {
			context.effects = prepareActiveEffectCategories(this.item.effects);
		}
		return context;
	}

	_prepareSubmitData(event, form, formData) {
		let submitData = super._prepareSubmitData(event, form, formData);
		const flattenedSubmitData = foundry.utils.flattenObject(submitData);
		const overrriddenKeys = Object.keys(foundry.utils.flattenObject(this.document.overrides));
		overrriddenKeys.forEach((key) => delete flattenedSubmitData[key]);
		submitData = foundry.utils.expandObject(flattenedSubmitData);
		return submitData;
	}
}
