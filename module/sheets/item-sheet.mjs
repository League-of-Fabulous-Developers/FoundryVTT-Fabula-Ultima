import { Effects, onManageActiveEffect, prepareActiveEffectCategories } from '../pipelines/effects.mjs';
import { Checks } from '../checks/checks.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { FU, systemPath } from '../helpers/config.mjs';
import { DamageTraits, Traits, TraitUtils } from '../pipelines/traits.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { ActiveEffectsTableRenderer } from '../helpers/tables/active-effects-table-renderer.mjs';
import { PseudoDocument } from '../documents/pseudo/pseudo-document.mjs';
import { PseudoItem } from '../documents/items/pseudo-item.mjs';
import { PseudoDocumentEnabledTypeDataModel } from '../documents/pseudo/pseudo-document-enabled-type-data-model.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';

const { api, sheets } = foundry.applications;

/**
 * @typedef DragDropConfiguration
 * @property {string|null} [dragSelector=null]  The CSS selector used to target draggable elements.
 * @property {string|null} [dropSelector=null]  The CSS selector used to target viable drop targets.
 * @property {Record<"dragstart"|"drop", (selector: string) => boolean>} [permissions]
 *                                         Permission tests for each action
 * @property {Record<
 *  "dragstart"|"dragover"|"drop"|"dragenter"|"dragleave"|"dragend",
 *  (event: DragEvent) => void
 * >} [callbacks]                         Callback functions for each action
 */

/**
 * @typedef ApplicationDragDropConfiguration
 * @property {DragDropConfiguration[]} dragDrop
 */

/**
 * @description Extend the basic ItemSheet with some very simple modifications
 * @property {FUItem} item
 * @property {FUItemDataModel} system
 * @extends {foundry.applications.sheets.ItemSheetV2}
 */
export class FUItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
	// Initialize drag counter
	dragCounter = 0;

	/**
	 * @returns {FUItemDataModel}
	 */
	get system() {
		return this.item.system;
	}

	/**
	 * @inheritDoc
	 * @type {ApplicationConfiguration & ApplicationDragDropConfiguration}
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'item', 'backgroundstyle'],
		actions: {
			editItem: FUItemSheet.#editItem,
			deleteItem: FUItemSheet.#deleteItem,
			roll: FUItemSheet.#rollItem,
			regenerateFuid: FUItemSheet.#regenerateFuid,
			// Active effects
			createEffect: FUItemSheet.CreateEffect,
			editEffect: FUItemSheet.EditEffect,
			deleteEffect: FUItemSheet.DeleteEffect,
			toggleEffect: FUItemSheet.ToggleEffect,
			copyInline: FUItemSheet.CopyInline,
			rollEffect: FUItemSheet.RollEffect,
			// Partials
			addArrayElement: FUItemSheet.#addArrayElement,
			removeArrayElement: FUItemSheet.#removeArrayElement,
		},
		scrollY: ['.sheet-body'],
		position: { width: 700, height: 'auto' },
		window: {
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
		dragDrop: [
			{
				dragSelector: '.draggable',
				permissions: {
					dragstart: FUItemSheet.#canDragStart,
					drop: FUItemSheet.#canDragDrop,
				},
				callbacks: {
					dragstart: FUItemSheet.#onDragStart,
					dragover: FUItemSheet.#onDragOver,
					drop: FUItemSheet.#onDrop,
				},
			},
		],
	};

	static _migrateConstructorParams(first, rest) {
		if (first?.document instanceof PseudoDocument) {
			return first;
		}
		return super._migrateConstructorParams(first, rest);
	}

	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		header: { template: systemPath('templates/item/parts/item-header.hbs') },
		tabs: { template: systemPath(`templates/item/parts/item-tabs.hbs`) },
		effects: { template: systemPath(`templates/item/parts/item-effects.hbs`) },
	};

	/**
	 * @type {DragDrop[]}
	 */
	#dragDrop;

	#temporaryEffectsTable = new ActiveEffectsTableRenderer('temporary');
	#passiveEffectsTable = new ActiveEffectsTableRenderer('passive');
	#inactiveEffectsTable = new ActiveEffectsTableRenderer('inactive');

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		// IMPORTANT: Set the active tab
		if (context.tabs && partId in context.tabs) {
			context.tab = context.tabs[partId];
		}
		switch (partId) {
			case 'header':
				context.traits = Object.keys(Traits);
				context.damageTraitOptions = TraitUtils.getOptions(DamageTraits);
				break;

			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				context.consumableType = CONFIG.FU.consumableType;
				context.heroicType = CONFIG.FU.heroicType;
				context.miscCategories = CONFIG.FU.miscCategories;
				context.treasureType = CONFIG.FU.treasureType;
				context.features = Object.entries(CONFIG.FU.classFeatureRegistry.qualifiedTypes).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
				context.optionals = Object.entries(CONFIG.FU.optionalFeatureRegistry.qualifiedTypes).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
				break;

			case 'effects':
				context.temporaryEffectsTable = await this.#temporaryEffectsTable.renderTable(this.document);
				context.passiveEffectsTable = await this.#passiveEffectsTable.renderTable(this.document);
				context.inactiveEffectsTable = await this.#inactiveEffectsTable.renderTable(this.document);
				break;
		}
		return context;
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Use a safe clone of the actor data for further operations.
		const actor = this.object?.parent ?? null;
		if (actor) {
			context.rollData = actor.getRollData();
		} else {
			// ?? Retrieve the roll data for TinyMCE editors.
			context.rollData = {};
		}
		context.actor = actor ? actor.toObject(false) : null;

		// Use a safe clone of the item data for further operations.
		context.item = this.item;
		context.system = context.item.system;
		context.flags = context.item.flags;
		context.FU = FU;
		context.effects = prepareActiveEffectCategories(this.item.effects);

		return context;
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);

		this.#dragDrop = this.#createDragDropHandlers();

		this.#temporaryEffectsTable.activateListeners(this);
		this.#passiveEffectsTable.activateListeners(this);
		this.#inactiveEffectsTable.activateListeners(this);
	}

	#createDragDropHandlers() {
		/** @type {DragDropConfiguration[]} */
		const dragDropConfigurations = this.options.dragDrop ?? [];
		return dragDropConfigurations.map((config) => {
			config.permissions ??= {};
			for (let key in config.permissions) {
				config.permissions[key] = config.permissions[key].bind(this);
			}

			config.callbacks ??= {};
			for (let key in config.callbacks) {
				config.callbacks[key] = config.callbacks[key].bind(this);
			}

			return new foundry.applications.ux.DragDrop.implementation(config);
		});
	}

	/**
	 * Attach event listeners to rendered template parts.
	 * @param {string} partId The id of the part being rendered
	 * @param {HTMLElement} html The rendered HTML element for the part
	 * @param {ApplicationRenderOptions} options Rendering options passed to the render method
	 * @protected
	 */
	_attachPartListeners(partId, html, options) {
		super._attachPartListeners(partId, html, options);
		switch (partId) {
			case 'effects':
				{
					// Render the active effect sheet for viewing/editing when middle-clicking
					html.querySelectorAll('.effect').forEach((el) => {
						el.addEventListener('mouseup', (ev) => {
							if (ev.button === 1 && !ev.target.classList.contains('effect-control')) {
								const simulatedEvent = {
									preventDefault: () => {},
									currentTarget: {
										dataset: { action: 'edit' },
										closest: () => el,
										classList: {
											contains: (cls) => el.classList.contains(cls),
										},
									},
								};
								onManageActiveEffect(simulatedEvent, this.item);
							}
						});
					});

					// Active Effect Roll
					html.querySelectorAll('.effect-roll').forEach((el) => {
						el.addEventListener('click', (ev) => {
							return onManageActiveEffect(ev, this.item);
						});
					});

					// Everything below here is only needed if the sheet is editable
					if (!this.isEditable) {
						return;
					}

					// Active Effect management
					html.querySelectorAll('.effect-control').forEach((el) => {
						el.addEventListener('click', (ev) => {
							return onManageActiveEffect(ev, this.item);
						});
					});
				}
				break;
		}
	}

	/* -------------------------------------------- */
	/*  Drag and Drop Support (as it's not implemented by default on ItemSheetV2
	/* -------------------------------------------- */
	/** @inheritDoc */
	async _onRender(context, options) {
		await super._onRender(context, options);
		this.#dragDrop.forEach((value) => value.bind(this.element));

		const flattenedOverrides = foundry.utils.flattenObject(this.item.overrides);
		Array.from(this.element.querySelectorAll('input[name], textarea[name], button[name], select[name]'))
			.filter((element) => element.name in flattenedOverrides)
			.forEach((element) => this.disableElement(element));
	}

	disableElement(element) {
		element.classList.add('disabled');
		if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
			element.readOnly = true;
		} else {
			element.disabled = true;
		}
		element.parentElement.dataset.tooltip = game.i18n.localize('FU.DisabledByActiveEffect');
	}

	/**
	 * @override
	 */
	_onClickAction(event, target) {
		if (target.closest('prose-mirror') || !target.closest('body')) {
			// prose mirror action button
			return;
		}

		if (this.#dispatchClickActionToItem(event, target)) {
			event.stopPropagation();
			event.preventDefault();
			return;
		}

		console.warn('Unhandled action:', target.dataset.action, event, target);
	}

	#dispatchClickActionToItem(event, target) {
		let success = false;

		let system = this.item.system;

		const nestedItemTarget = target.closest('[data-item-id]');

		if (nestedItemTarget) {
			let item = this.item.getEmbeddedDocument('Item', nestedItemTarget.dataset.itemId);
			if (!item) {
				item = fromUuidSync(nestedItemTarget.dataset.uuid);
			}
			if (item) {
				system = item.system;
			}
		}

		if (system[target.dataset.action] instanceof Function) {
			system[target.dataset.action](event, target);
			success = true;
		} else if (['classFeature', 'optionalFeature'].includes(system.parent.type)) {
			if (system.data[target.dataset.action] instanceof Function) {
				system.data[target.dataset.action](event, target);
				success = true;
			}
		}

		return success;
	}

	static #onDragStart(event) {
		return this._onDragStart(event);
	}

	/**
	 * An event that occurs when a drag workflow begins for a draggable item on the sheet.
	 * @param {DragEvent} event       The initiating drag start event
	 * @returns {Promise<void>}
	 * @protected
	 */
	_onDragStart(event) {
		const target = event.currentTarget;
		if ('link' in event.target.dataset) return;
		let dragData;

		// Owned Items
		if (target.dataset.itemId) {
			const item = this.item.getEmbeddedDocument(foundry.documents.Item.documentName, target.dataset.itemId);
			dragData = item?.toDragData();
		}

		// Active Effect
		if (target.dataset.effectId) {
			const effect = this.item.effects.get(target.dataset.effectId);
			dragData = effect.toDragData();
		}

		// Set data transfer
		if (!dragData) return;
		event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
		// Custom highlighting
		this.dragCounter++;
		const dropZone = $(event.currentTarget);
		dropZone.addClass('highlight-drop-zone');
	}

	static #onDragOver(event) {
		return this._onDragOver(event);
	}

	/**
	 * An event that occurs when a drag workflow moves over a drop target.
	 * @param {DragEvent} event
	 * @protected
	 */
	_onDragOver(event) {
		this.dragCounter--;
		if (this.dragCounter === 0) {
			const dropZone = $(event.currentTarget);
			dropZone.removeClass('highlight-drop-zone');
		}
	}

	static #onDrop(event) {
		return this._onDrop(event);
	}

	/**
	 * An event that occurs when data is dropped into a drop target.
	 * @param {DragEvent} event
	 * @returns {Promise<void>}
	 * @protected
	 */
	async _onDrop(event) {
		console.debug(`Drop event detected on ${this.item.name}`);
		event.preventDefault();

		// Custom highlighting
		this.dragCounter = 0;
		const dropZone = $(event.currentTarget);
		dropZone.removeClass('highlight-drop-zone');

		// Retrieve drag data using TextEditor
		const data = TextEditor.implementation.getDragEventData(event);

		if (data.type === 'Item') {
			const itemData = await Item.implementation.fromDropData(data);

			// Determine the configuration based on item type
			const config = this._findItemConfig(itemData.type);
			if (config) {
				// Check if there is an active ProseMirror editor
				const activeEditor = document.querySelector('.editor-content.ProseMirror');
				if (itemData.type === 'effect') {
					if (activeEditor) {
						// Handle effect drop into ProseMirror editor
						await this._handleEditorEffectDrop(itemData, event);
					} else {
						// Handle effect drop into actor sheet
						await this._importEffectData(itemData);
					}
				} else {
					// Handle other item drops
					await this._processItemDrop(itemData, config);
				}
			}
		} else if (data.type === 'ActiveEffect') {
			const effect = await ActiveEffect.implementation.fromDropData(data);
			if (!this.item.isOwner || !effect) {
				return false;
			}
			if (effect.target === this.item) {
				return false;
			}
			return ActiveEffect.create(effect.toObject(), { parent: this.item });
		}
	}

	static #canDragStart(selector) {
		return this._canDragStart(selector);
	}

	/**
	 * Define whether a user is able to begin a dragstart workflow for a given drag selector.
	 * @param {string} selector       The candidate HTML selector for dragging
	 * @returns {boolean}             Can the current user drag this selector?
	 * @protected
	 */
	_canDragStart(selector) {
		return this.isEditable;
	}

	static #canDragDrop(selector) {
		return this._canDragStart(selector);
	}

	/**
	 * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
	 * @param {string} selector       The candidate HTML selector for the drop target
	 * @returns {boolean}             Can the current user drop on this selector?
	 * @protected
	 */
	_canDragDrop(selector) {
		return this.isEditable;
	}

	// Helper function to find the appropriate update configuration
	_findItemConfig(type) {
		const itemTypeConfigs = [
			{
				types: ['effect'],
				update: async (itemData) => {
					// Effects are handled separately
					return;
				},
			},
		];

		return itemTypeConfigs.find((config) => config.types.includes(type));
	}

	// Process item drop based on the configuration
	async _processItemDrop(itemData, config) {
		const existingItem = this.actor.items.find((i) => i.name === itemData.name && i.type === itemData.type);
		if (existingItem) {
			await config.update(itemData, existingItem);
		}
	}

	// Import effect data into the specific item's effects array
	async _importEffectData(itemData) {
		const newEffects = itemData.effects || [];

		// Get existing effect IDs from the item
		const existingEffectIds = this.item.effects.map((effect) => effect._id);

		// Filter out new effects that are already present
		const filteredNewEffects = newEffects.filter((effect) => !existingEffectIds.includes(effect._id));

		// Create new ActiveEffect documents for the filtered effects
		if (filteredNewEffects.length > 0) {
			const effectsToCreate = filteredNewEffects.map((effectData) => ({
				...effectData,
				parent: this.item,
			}));

			// Create the new ActiveEffect documents
			await ActiveEffect.createDocuments(effectsToCreate, { parent: this.item });

			// console.log('Created New Effects:', createdEffects);
		} else {
			console.log('No new effects to add');
		}
	}

	// Handle dropping effects into a text editor
	async _handleEditorEffectDrop(itemData, event) {
		const activeEditor = document.querySelector('.editor-content.ProseMirror');
		if (activeEditor) {
			const effects = itemData.effects || [];
			// Use an arrow function to ensure `this` context is correct
			const formattedEffects = effects.map((effect) => Effects.formatEffect(effect)).join(' ');

			// Prevent the default behavior of creating a link
			event.preventDefault();
			event.stopPropagation();

			// Get the current content of the editor
			const currentContent = activeEditor.innerHTML;

			// Append the formatted effects to the current content of the editor
			activeEditor.innerHTML = currentContent + formattedEffects;

			console.log(`Appended formatted effects to the ProseMirror editor.`);
		} else {
			console.log('No active ProseMirror editor found.');
		}
	}
	/* -------------------------------------------- */

	/**
	 * @override
	 */
	_getHeaderButtons() {
		const buttons = super._getHeaderButtons();
		buttons.unshift({
			label: game.i18n.localize('FU.ChatMessageSend'),
			class: 'send-to-chat',
			icon: 'fas fa-comment',
			onclick: this._onSendToChat.bind(this),
		});
		return buttons;
	}

	/**
	 * @override
	 */
	_prepareSubmitData(event, form, formData, updateData) {
		const data = super._prepareSubmitData(event, form, formData, updateData);
		// Prevent submitting overridden values

		for (let k of Object.keys(foundry.utils.flattenObject(this.item.overrides))) {
			foundry.utils.deleteProperty(data, k);
		}
		return data;
	}

	_onSendToChat(event) {
		event.preventDefault();
		const item = this.item;
		Checks.display(this, item);
	}

	/**
	 * @this FUStandardItemSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #regenerateFuid(event, target) {
		const newFUID = await this.item.regenerateFUID();
		if (newFUID) {
			this.render();
		}
	}

	/**
	 * @this FUStandardItemSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addArrayElement(event, target) {
		const path = target.dataset.path;
		if (path) {
			const array = ObjectUtils.getProperty(this.item, path);
			if (array) {
				array.push(null);
				await this.item.update({
					[`${path}`]: array,
				});
			}
		}
	}

	/**
	 * @this FUStandardItemSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeArrayElement(event, target) {
		const path = target.dataset.path;
		const index = Number.parseInt(target.dataset.index);
		if (path) {
			/** @type [] **/
			const array = ObjectUtils.getProperty(this.item, path);
			if (array && index !== undefined) {
				array.splice(index, 1);
				await this.item.update({
					[`${path}`]: array,
				});
			}
		}
	}

	// TODO: Re-use with the ones from actor sheet?
	/* -------------------------------------------- */
	// ACTIVE EFFECTS
	static CreateEffect(event, target) {
		onManageActiveEffect(event, this.item, 'create');
	}

	static EditEffect(event, target) {
		onManageActiveEffect(event, this.item, 'edit');
	}

	static DeleteEffect(event, target) {
		onManageActiveEffect(event, this.item, 'delete');
	}

	static CopyInline(event, target) {
		onManageActiveEffect(event, this.item, 'copy-inline');
	}

	static ToggleEffect(event, target) {
		onManageActiveEffect(event, this.item, 'toggle');
	}

	static async RollEffect(event, target) {
		return onManageActiveEffect(event, this.item, 'roll');
	}

	static #editItem(event, target) {
		if (this.item.system instanceof PseudoDocumentEnabledTypeDataModel) {
			const id = target.closest('[data-item-id]').dataset.itemId;
			for (const collection of Object.values(this.item.system.collections)) {
				const nestedItem = collection.get(id);
				if (nestedItem) {
					nestedItem.sheet.render({ force: true });
					return;
				}
			}
		}
	}

	static async #deleteItem(event, target) {
		if (this.item.system instanceof PseudoDocumentEnabledTypeDataModel) {
			const id = target.closest('[data-item-id]').dataset.itemId;
			for (const collection of Object.values(this.item.system.collections)) {
				if (collection.documentClass !== PseudoItem) return;

				const item = collection.get(id);
				if (item) {
					const promises = [];
					if (item.actor && item.isSocketable) {
						const itemObject = item.toObject(true);
						promises.push(this.item.actor.createEmbeddedDocuments('Item', [itemObject]));
						promises.push(item.delete());
					} else {
						const doDelete = await foundry.applications.api.DialogV2.confirm({
							window: { title: game.i18n.format('FU.DialogDeleteItemTitle', { item: item.name }) },
							content: game.i18n.format('FU.DialogDeleteItemDescription', { item: item.name }),
							rejectClose: false,
						});
						if (doDelete) {
							promises.push(item.delete());
						}
					}
					return Promise.all(promises);
				}
			}
		}
	}

	static #rollItem(event, target) {
		const itemId = target.closest('[data-item-id]').dataset.itemId;
		const item = this.item.getEmbeddedDocument('Item', itemId);
		if (item) {
			if (this.item.actor) {
				return item.roll();
			} else {
				return Checks.display(null, item);
			}
		}
	}
}
