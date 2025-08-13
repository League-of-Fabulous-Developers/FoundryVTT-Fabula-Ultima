import { Effects, onManageActiveEffect, prepareActiveEffectCategories } from '../pipelines/effects.mjs';
import { Checks } from '../checks/checks.mjs';
import { FU, systemPath } from '../helpers/config.mjs';
import { Traits } from '../pipelines/traits.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';

const { api, sheets } = foundry.applications;

/**
 * @description Extend the basic ItemSheet with some very simple modifications
 * @property {FUItem} item
 * @property {FUItemDataModel} system
 * @extends {ItemSheet}
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
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'item', 'backgroundstyle'],
		actions: {
			regenerateFuid: this.#regenerateFuid,
			// Active effects
			createEffect: FUItemSheet.CreateEffect,
			editEffect: FUItemSheet.EditEffect,
			deleteEffect: FUItemSheet.DeleteEffect,
			toggleEffect: FUItemSheet.ToggleEffect,
			copyInline: FUItemSheet.CopyInline,
			rollEffect: FUItemSheet.RollEffect,
		},
		scrollY: ['.sheet-body'],
		position: { width: 700, height: 'auto' },
		window: {
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
		// TODO: Probably doesn't do anything
		dragDrop: [
			{
				dragSelector: '.directory-item.document.item, .effects-list .effect', // Selector for draggable items
				dropSelector: '.desc.drop-zone', // Selector for item sheet
			},
		],
	};

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

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		// IMPORTANT: Set the active tab
		if (partId in context.tabs) {
			context.tab = context.tabs[partId];
		}
		switch (partId) {
			case 'header':
				context.traits = Object.keys(Traits);
				context.traitOptions = context.traits.map((key) => ({
					label: key,
					value: key,
				}));
				break;

			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				context.consumableType = CONFIG.FU.consumableType;
				context.heroicType = CONFIG.FU.heroicType;
				context.miscCategories = CONFIG.FU.miscCategories;
				context.treasureType = CONFIG.FU.treasureType;
				context.features = Object.entries(CONFIG.FU.classFeatureRegistry.all).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
				context.optionals = Object.entries(CONFIG.FU.optionalFeatureRegistry.all).reduce((agg, [key, value]) => (agg[key] = value.translation) && agg, {});
				break;

			case 'effects':
				{
					// Prepare active effects for easier access
					context.effects = prepareActiveEffectCategories(this.item.effects);

					// Combine all effects into a single array
					context.allEffects = [...context.effects.temporary.effects, ...context.effects.passive.effects, ...context.effects.inactive.effects];

					// Enrich each effect's description
					const actor = this.object?.parent ?? null;
					for (const effect of context.allEffects) {
						effect.enrichedDescription = effect.description
							? await TextEditor.enrichHTML(effect.description, {
									secrets: actor?.isOwner ?? false,
									rollData: actor ? actor.getRollData() : {},
									relativeTo: actor,
								})
							: '';
					}
				}
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

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;

		// [PDFPager Support] Opening Journal PDF pages from PDF Code
		document.getElementById('pdfLink')?.addEventListener('click', () => {
			const input = document.querySelector('input[name="system.source.value"]');
			const inputValue = input?.value || '';
			const match = inputValue.match(/([A-Za-z]+)\s*(\d+)/);

			if (match) {
				const pdfCode = match[1];
				const pageNumber = match[2];

				// Check if the openPDFByCode function exists
				if (ui.pdfpager && ui.pdfpager.openPDFByCode) {
					ui.pdfpager.openPDFByCode(pdfCode, { page: pageNumber });
				} else {
					// TODO: Create Fallback method using a normal Foundry link
				}
			} else {
				console.error('Invalid input format. Please use proper syntax "PDFCode PageNumber"');
			}
		});

		// dropzone event listeners
		const dropZone = html.querySelector('.desc.drop-zone');
		dropZone?.addEventListener('dragenter', this._onDragEnter.bind(this));
		dropZone?.addEventListener('dragleave', this._onDragLeave.bind(this));
		dropZone?.addEventListener('drop', this._onDropReset.bind(this));
	}

	/**
	 * Modify the provided options passed to a render request.
	 * @param {RenderOptions} options                 Options which configure application rendering behavior
	 * @protected
	 */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
	}

	/* -------------------------------------------- */

	_onDragEnter(event) {
		event.preventDefault();
		this.dragCounter++;
		const dropZone = $(event.currentTarget);
		dropZone.addClass('highlight-drop-zone');
	}

	_onDragLeave(event) {
		event.preventDefault();
		this.dragCounter--;
		if (this.dragCounter === 0) {
			const dropZone = $(event.currentTarget);
			dropZone.removeClass('highlight-drop-zone');
		}
	}

	_onDropReset(event) {
		this.dragCounter = 0;
		const dropZone = $(event.currentTarget);
		dropZone.removeClass('highlight-drop-zone');
	}

	_onDragStart(event) {
		const li = event.currentTarget;
		if ('link' in event.target.dataset) {
			return;
		}

		// Create drag data
		let dragData;

		// Active Effect
		if (li.dataset.effectId) {
			const effect = this.item.effects.get(li.dataset.effectId);
			dragData = effect.toDragData();
		}

		if (!dragData) {
			return;
		}

		// Set data transfer
		event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
	}

	async _onDrop(event) {
		console.debug('Drop event detected');
		event.preventDefault();

		// Retrieve drag data using TextEditor
		const data = TextEditor.getDragEventData(event);

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
		} else {
			// Default behavior for unknown item types
			await super._onDrop(event);
		}
	}

	_canDragDrop() {
		console.log('Checking drag drop capability');
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
		} else {
			await super._onDrop(event);
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
	_getSubmitData(updateData = {}) {
		const data = super._getSubmitData(updateData);
		// Prevent submitting overridden values
		const overrides = foundry.utils.flattenObject(this.item.overrides);
		for (let k of Object.keys(overrides)) {
			delete data[k];
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
}
