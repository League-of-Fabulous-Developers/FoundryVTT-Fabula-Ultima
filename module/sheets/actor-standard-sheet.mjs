import { Effects, isActiveEffectForStatusEffectId, onManageActiveEffect } from '../pipelines/effects.mjs';
import { ItemCustomizer } from '../helpers/item-customizer.mjs';
import { ActionHandler } from '../helpers/action-handler.mjs';
import { EquipmentHandler } from '../helpers/equipment-handler.mjs';
import { SETTINGS } from '../settings.js';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Checks } from '../checks/checks.mjs';
import { GroupCheck as GroupCheckV2 } from '../checks/group-check.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { PlayerListEnhancements } from '../helpers/player-list-enhancements.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { systemTemplatePath } from '../helpers/system-utils.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { BehaviorRoll } from '../documents/items/behavior/behavior-roll.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { CheckPrompt } from '../checks/check-prompt.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { CheckHooks } from '../checks/check-hooks.mjs';
import { CommonSections } from '../checks/common-sections.mjs';

const TOGGLEABLE_STATUS_EFFECT_IDS = ['crisis', 'slow', 'dazed', 'enraged', 'dex-up', 'mig-up', 'ins-up', 'wlp-up', 'guard', 'weak', 'shaken', 'poisoned', 'dex-down', 'mig-down', 'ins-down', 'wlp-down'];

const affinityKey = 'affinity';

/**
 * @type {RenderCheckHook}
 */
const onDisplayAffinity = (sections, check, actor, item, additionalFlags, targets) => {
	const affinity = check.additionalData[affinityKey];
	if (check.type === 'display' && affinity) {
		const affinityData = actor.system.affinities[affinity];

		const description = game.i18n.format('FU.AffinityDescription', {
			affinityName: game.i18n.localize(FU.damageTypes[affinity]),
			affinityValue: game.i18n.localize(FU.affType[affinityData.current]),
		});
		CommonSections.genericFlavor(sections, game.i18n.localize('FU.CurrentAffinity'));
		CommonSections.genericText(sections, description);
	}
};

Hooks.on(CheckHooks.renderCheck, onDisplayAffinity);

/**
 * @description Standard actor sheet, now v2
 * @property [FUActor] actor
 * @extends {FUActorSheet}
 */
export class FUStandardActorSheet extends FUActorSheet {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['sheet-header'],
		position: {
			width: 750,
			height: 1000,
		},
		actions: {
			roll: FUStandardActorSheet.Roll,
			spendMetaCurrency: FUStandardActorSheet.SpendMetaCurrency,
			studyAction: FUStandardActorSheet.StudyAction,
			action: FUStandardActorSheet.PerformAction,
			toggleStatusEffect: FUStandardActorSheet.ToggleStatusEffect,
			useEquipment: FUStandardActorSheet.ToggleUseEquipment,
			itemFavored: FUStandardActorSheet.ToggleItemFavored,
			zenitTransfer: FUStandardActorSheet.ZenitTransfer,
			crisisHP: FUStandardActorSheet.CrisisHP,
			addBond: FUStandardActorSheet.AddBond,
			deleteBond: FUStandardActorSheet.DeleteBond,
			updateProgress: { handler: FUStandardActorSheet.UpdateProgress, buttons: [0, 2] },
			rest: FUStandardActorSheet.handleRestClick,
			sortFavorites: FUStandardActorSheet.sortFavorites,
			levelUp: FUStandardActorSheet.levelUp,

			// Buttons
			modifyClassLevel: FUStandardActorSheet.modifyClassLevel,
			modifyResource: { handler: FUStandardActorSheet.modifyResource, buttons: [0, 2] },
			equipItem: { handler: FUStandardActorSheet.equipItem, buttons: [0, 2] },

			// Features
			toggleActiveArcanum: FUStandardActorSheet.updateArcanistArcanum,
			toggleActiveGarden: FUStandardActorSheet.toggleActiveGarden,
			togglePlantedMagiseed: FUStandardActorSheet.togglePlantedMagiseed,
			updatePilotVehicle: FUStandardActorSheet.updatePilotVehicle,

			// Active effects
			createEffect: FUStandardActorSheet.CreateEffect,
			editEffect: FUStandardActorSheet.EditEffect,
			deleteEffect: FUStandardActorSheet.DeleteEffect,
			toggleEffect: FUStandardActorSheet.ToggleEffect,
			copyInline: FUStandardActorSheet.CopyInline,
			rollEffect: FUStandardActorSheet.RollEffect,
			clearTempEffects: FUStandardActorSheet.ClearTempEffects,
		},
	};

	// These will be filtered in _configureRenderOptions
	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		header: { template: systemTemplatePath('actor/character/parts/actor-header') },
		tabs: { template: systemTemplatePath(`actor/character/parts/actor-tabs`) },
		stats: { template: systemTemplatePath(`actor/character/parts/actor-section-stats`) },
		features: { template: systemTemplatePath(`actor/character/parts/actor-section-features`) },
		// NPC
		combat: { template: systemTemplatePath(`actor/character/parts/actor-section-combat`) },
		behavior: { template: systemTemplatePath(`actor/character/parts/actor-section-behavior`) },
		// Character
		classes: { template: systemTemplatePath(`actor/character/parts/actor-section-classes`) },
		items: { template: systemTemplatePath(`actor/character/parts/actor-section-items`) },
		spells: { template: systemTemplatePath(`actor/character/parts/actor-section-spells`) },
		notes: { template: systemTemplatePath(`actor/character/parts/actor-section-notes`) },
		effects: { template: systemTemplatePath('actor/character/parts/actor-section-effects') },
		settings: { template: systemTemplatePath(`actor/character/parts/actor-section-settings`) },
	};

	/**
	 * These arrays are used in _configureRenderOptions later to filter out template parts
	 * used for the actual type of actor (character, npc, limited character, limited npc)
	 * being displayed
	 */

	/** @override
	 * @type Record<ApplicationTab>
	 **/
	static TABS = {
		primary: {
			tabs: [
				{ id: 'stats', label: 'FU.Stats' },
				{ id: 'classes', label: 'FU.Classes' },
				{ id: 'features', label: 'FU.Features' },
				{ id: 'spells', label: 'FU.Spell' },
				{ id: 'items', label: 'FU.Items' },
				{ id: 'combat', label: 'FU.Combat' },
				{ id: 'behavior', label: 'FU.Behavior' },

				{ id: 'notes', label: '', icon: 'fa-solid fa-file-pen' },
				{ id: 'effects', label: '', icon: 'fa-solid fa-wand-magic-sparkles' },
				{ id: 'settings', label: '', icon: 'fa-solid fa-sliders' },
			],
			initial: 'stats',
		},
	};

	// Initialize sortOrder
	sortOrder = 1;
	#equipmentHandler;

	constructor(options) {
		super(options);
		this.#equipmentHandler = new EquipmentHandler(this.actor);
	}

	/**
	 * @override
	 */
	_onClickAction(event, target) {
		console.warn('Unhandled action:', target.dataset.action, event, target);
	}

	/**
	 * @returns {Boolean}
	 */
	get isLimited() {
		const wl = ['character', 'npc'];
		return !game.user.isGM && !this.actor.testUserPermission(game.user, 'OBSERVER') && wl.includes(this.actor.type);
	}

	get isNPC() {
		return this.actor.type === 'npc';
	}

	get isCharacter() {
		return this.actor.type === 'character';
	}

	/* -------------------------------------------- */

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
	}

	/** @inheritdoc */
	_prepareTabs(group) {
		const tabs = super._prepareTabs(group);

		switch (this.actor.type) {
			case 'character':
				delete tabs.behavior;
				delete tabs.combat;
				break;

			case 'npc':
				{
					delete tabs.features;
					delete tabs.classes;
					delete tabs.spells;
					delete tabs.items;

					// Behavior roll
					if (!game.settings.get('projectfu', 'optionBehaviorRoll')) {
						delete tabs.behavior;
					}
					// NPC notes
					if (!game.settings.get('projectfu', 'optionNPCNotesTab')) {
						delete tabs.notes;
					}
				}
				break;
		}

		return tabs;
	}

	/**
	 * @description Allow subclasses to dynamically configure render parts.
	 * @param {HandlebarsRenderOptions} options
	 * @returns {Record<string, HandlebarsTemplatePart>}
	 * @protected
	 */
	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);
		switch (this.actor.type) {
			case 'character':
				delete parts.behavior;
				delete parts.combat;
				break;

			case 'npc':
				delete parts.features;
				delete parts.classes;
				delete parts.spells;
				delete parts.items;
				// Behavior roll
				if (!game.settings.get('projectfu', 'optionBehaviorRoll')) {
					delete parts.behavior;
				}
				if (!game.settings.get(SYSTEM, SETTINGS.optionNPCNotesTab)) {
					delete parts.notes;
				}
				break;
		}
		Object.entries(parts).forEach(([partId, config]) => {
			if (!['header', 'tabs'].includes(partId)) {
				config.scrollable ??= [''];
			}
		});
		return parts;
	}

	/**
	 * @param {string} partId                         The part being rendered
	 * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
	 * @param {HandlebarsRenderOptions} options       Options which configure application rendering behavior
	 * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
	 * @protected
	 */
	async _preparePartContext(partId, context, options) {
		context = await super._preparePartContext(partId, context, options);
		// IMPORTANT: Set the active tab
		if (partId in context.tabs) {
			context.tab = context.tabs[partId];
		}

		switch (partId) {
			case 'header':
				{
					context.showMetaCurrency = this.isCharacter || this.actor.system.villain.value;
					// Setup status effect toggle data
					context.statusEffectToggles = [];
					for (const id of TOGGLEABLE_STATUS_EFFECT_IDS) {
						const statusEffect = CONFIG.statusEffects.find((e) => e.id === id);
						if (statusEffect) {
							const existing = this.actor.effects.some((e) => isActiveEffectForStatusEffectId(e, statusEffect.id));
							const immune = this.actor.system.immunities?.[statusEffect.id]?.base || false;
							const ruleKey = FU.statusEffectRule[statusEffect.id] || '';
							const rule = game.i18n.localize(ruleKey);
							const tooltip = `${game.i18n.localize(statusEffect.name)}<br>${rule}`;
							context.statusEffectToggles.push({
								...statusEffect,
								active: existing,
								immune: immune,
								tooltip: tooltip,
							});
						}
					}
				}
				if (this.isNPC) {
					ActorSheetUtils.prepareNpcCompanionData(context);
				}
				break;

			case 'stats':
				{
					if (this.isNPC) {
						const studyRollTiers = game.settings.get(SYSTEM, SETTINGS.useRevisedStudyRule) ? FU.studyRoll.revised : FU.studyRoll.core;
						let studyRoll;
						studyRoll = studyRollTiers.map((value) => value + '+');
						studyRoll.unshift('-');
						studyRoll = studyRoll.reduce((agg, curr, idx) => (agg[idx] = curr) && agg, {});
						context.studyRoll = studyRoll;

						context.enrichedHtml = {
							description: await TextEditor.enrichHTML(context.system.description ?? '', {
								secrets: this.actor.isOwner,
								rollData: context.actor.getRollData(),
								relativeTo: context.actor,
							}),
						};
					}
					await ActorSheetUtils.prepareFeatures(context);
				}
				break;

			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				break;

			case 'features':
				await ActorSheetUtils.prepareProjects(context);
				await ActorSheetUtils.prepareFeatures(context);
				await ActorSheetUtils.prepareAbilities(context);
				break;

			case 'classes':
				await ActorSheetUtils.prepareClasses(context);
				break;

			case 'spells':
				await ActorSheetUtils.prepareSpells(context);
				break;

			case 'combat':
				await ActorSheetUtils.prepareAbilities(context);
				await ActorSheetUtils.prepareNpcCombat(context);
				await ActorSheetUtils.prepareSpells(context);
				if (this.actor.system.useEquipment.value) {
					await ActorSheetUtils.prepareInventory(context);
				}
				break;

			case 'behavior':
				context.behaviors = this.actor.getItemsByType('behavior');
				break;

			case 'items':
				{
					// Set up item data
					await ActorSheetUtils.prepareInventory(context);
					await ActorSheetUtils.prepareItems(context);
					ActorSheetUtils.prepareSorting(context);
				}
				break;

			case 'effects':
				// Prepare active effects
				context.effects = this.actor.effectCategories;
				// Combine all effects into a single array
				context.allEffects = [...context.effects.temporary.effects, ...context.effects.passive.effects, ...context.effects.inactive.effects];
				// Enrich each effect's description
				for (const effect of context.allEffects) {
					effect.enrichedDescription = effect.description
						? await TextEditor.enrichHTML(effect.description, {
								secrets: this.actor.isOwner,
								rollData: context.actor.getRollData(),
								relativeTo: context.actor,
							})
						: '';
				}
				break;

			case 'settings':
				if (this.isNPC) {
					ActorSheetUtils.prepareNpcCompanionData(context);
				}
				break;
			case 'notes': {
				context.enrichedHtml = {
					description: await TextEditor.enrichHTML(context.system.description ?? '', {
						secrets: this.actor.isOwner,
						rollData: context.actor.getRollData(),
						relativeTo: context.actor,
					}),
				};
			}
		}

		return context;
	}

	/**
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'classes': {
				element.addEventListener('click', (ev) => {
					const target = ev.target;
					if (target.matches('.skillLevel input')) {
						this._onSkillLevelUpdate(target);
					}
				});
				element.addEventListener('contextmenu', (ev) => {
					if (ev.target.closest('.skillLevel')) {
						ev.preventDefault();
						this._onSkillLevelReset(ev.target);
					}
				});
				break;
			}
		}
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.isNPC = this.isNPC;
		context.isCharacter = this.isCharacter;
		context.FU = FU;
		// Model agnostic
		await ActorSheetUtils.prepareData(context, this);
		await ActorSheetUtils.enrichItems(context);
		// For characters/npcs
		ActorSheetUtils.prepareCharacterData(context);

		// Prepare character data and items.
		if (this.isCharacter) {
			context.tlTracker = this.actor.tlTracker;
		}
		// Prepare NPC data and items.
		else if (this.isNPC) {
			context.spTracker = this.actor.spTracker;
		}

		// Add roll data for TinyMCE editors.
		context.rollData = context.actor.getRollData();

		return context;
	}

	/* -------------------------------------------- */
	/**
	 * @override
	 * @private
	 */
	async _updateObject(event, formData) {
		// Foundry's form update handlers send back bond information as an object {0: ..., 1: ....}
		// So correct an update in that form and create an updated bond array to properly represent the changes
		const bonds = formData.system?.resources?.bonds;
		if (bonds && !Array.isArray(bonds)) {
			formData.system.bonds = Array.from(Object.values(bonds));
		}
		super._updateObject(event, formData);
	}

	async _onDrop(ev) {
		ev.preventDefault();

		// Retrieve drag data using TextEditor
		const data = TextEditor.getDragEventData(ev);
		if (!data || data.type !== 'Item') {
			return await super._onDrop(ev);
		}

		// Check if the item is embedded within an actor (reordering within the sheet) and uses default behavior
		if (data.uuid.startsWith('Actor')) {
			const [, actorId] = data.uuid.split('.');
			if (actorId === this.actor.id) {
				return await super._onDrop(ev);
			}
		}

		// Proceed if the item is being dragged from the compendium/sidebar or other actors
		const itemData = await this._getItemDataFromDropData(data);

		if (typeof itemData.system.onActorDrop === 'function') {
			if (itemData.system.onActorDrop(this.actor) === false) {
				return;
			}
		}

		const subtype = itemData.system.subtype?.value;
		// Determine the configuration based on item type
		const config = ActorSheetUtils.findItemConfig(itemData.type, subtype);
		if (config) {
			// Check if there is an active ProseMirror editor
			const activeEditor = document.querySelector('.editor-content.ProseMirror');
			if (itemData.type === 'effect') {
				if (activeEditor) {
					// Handle effect drop into ProseMirror editor
					await this._handleEditorEffectDrop(itemData, ev);
				} else {
					// Handle effect drop into actor sheet
					await this._importEffectData(itemData);
				}
			} else {
				// Handle other item drops
				await this._processItemDrop(itemData, config);
			}
		} else {
			// Default behavior for unknown item types
			try {
				await super._onDrop(ev);
			} catch (ex) {
				console.warn(`No drop implementation for type ${subtype}`);
			}
		}
	}

	// Helper function to get item data from drop data
	async _getItemDataFromDropData(data) {
		try {
			return await Item.implementation.fromDropData(data);
		} catch (error) {
			console.error('Failed to get item data from drop data:', error);
			return null;
		}
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

	// Import effect data to the actor
	async _importEffectData(itemData) {
		const effects = itemData.effects || [];
		const existingEffects = this.actor.items.filter((i) => i.type === 'ActiveEffect').map((e) => e.data.name);
		for (const effect of effects) {
			if (!existingEffects.includes(effect.name)) {
				await this.actor.createEmbeddedDocuments('ActiveEffect', [effect]);
			}
		}
	}

	// Handle dropping effects into a text editor
	async _handleEditorEffectDrop(itemData, ev) {
		const activeEditor = document.querySelector('.editor-content.ProseMirror');
		if (activeEditor) {
			const effects = itemData.effects || [];
			const formattedEffects = effects.map((effect) => Effects.formatEffect(effect)).join(' ');

			ev.preventDefault();
			ev.stopPropagation();

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
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;
		ActorSheetUtils.activateDefaultListeners(html, this);

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) {
			return;
		}

		ActorSheetUtils.activateInventoryListeners(this.element, this);

		// Editable item actions
		html.addEventListener('click', (ev) => {
			if (ev.target.closest('.progress input')) {
				const progress = ev.target.closest('.progress');
				const dataType = progress?.dataset.type;
				const dataPath = progress?.dataset.dataPath;
				const input = ev.target;
				this._onProgressUpdate(input, dataType, dataPath);
			}
		});
		html.addEventListener('contextmenu', (ev) => {
			const target = ev.target;
			if (target.closest('.progress input')) {
				const progress = target.closest('.progress');
				const dataType = progress?.dataset.type;
				const dataPath = progress?.dataset.dataPath;
				this._onProgressReset(ev.target, dataType, dataPath);
			}
		});

		this.loadSortingMethod();

		// Dropzone event listeners
		const dropZone = html.querySelector('.desc.drop-zone');
		if (dropZone) {
			dropZone.addEventListener('dragenter', this._onDragEnter.bind(this));
			dropZone.addEventListener('dragleave', this._onDragLeave.bind(this));
			dropZone.addEventListener('drop', this._onDropReset.bind(this));
		}
	}

	loadSortingMethod() {
		if (this.actor) {
			const flags = this.actor.getFlag('projectfu', 'sortMethod');

			if (flags) {
				flags
					.then((sortMethod) => {
						if (sortMethod) {
							this.sortMethod = sortMethod;
							this.render();
						}
					})
					.catch((error) => {
						console.error(`Error loading sortMethod: ${error}`);
					});
			}
		}
	}

	/* -------------------------------------------- */
	_onDragEnter(ev) {
		ev.preventDefault();
		this.dragCounter++;
		const dropZone = $(ev.currentTarget);
		dropZone.addClass('highlight-drop-zone');
	}

	_onDragLeave(ev) {
		ev.preventDefault();
		this.dragCounter--;
		if (this.dragCounter === 0) {
			const dropZone = $(ev.currentTarget);
			dropZone.removeClass('highlight-drop-zone');
		}
	}

	_onDropReset(ev) {
		this.dragCounter = 0;
		const dropZone = $(ev.currentTarget);
		dropZone.removeClass('highlight-drop-zone');
	}

	/* -------------------------------------------- */

	// Method to change the sort type
	changeSortType() {
		if (this.sortMethod === 'name') {
			this.sortMethod = 'type';
		} else {
			this.sortMethod = 'name';
		}

		this.render();
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async handleRestClick(event, target) {
		event.preventDefault();
		const isRightClick = event.type === 'contextmenu';
		await this.actor.rest(isRightClick);
	}

	/**
	 * @description Sets the skill level value to the segment clicked.
	 * @param {HTMLInputElement} input - The input change event.
	 */
	_onSkillLevelUpdate(input) {
		const segment = input.value;

		const li = input.closest('[data-item-id]');

		if (li) {
			const itemId = li.dataset.itemId;
			const item = this.actor.items.get(itemId);

			if (item) {
				item.update({ 'system.level.value': segment });
			} else {
				console.error(`Item with ID ${itemId} not found.`);
			}
		} else {
			console.error('Parent item not found.');
		}
	}

	/**
	 * @description Resets the skill level value to 0 on right-click.
	 * @param {HTMLElement} input - The context menu event.
	 */
	_onSkillLevelReset(input) {
		const li = input.closest('[data-item-id]');

		if (li) {
			const itemId = li.dataset.itemId;
			const item = this.actor.items.get(itemId);

			if (item) {
				item.update({ 'system.level.value': 0 });
			} else {
				console.error(`Item with ID ${itemId} not found.`);
			}
		} else {
			console.error('Parent item not found.');
		}
	}

	async _updateLevel(item, increment) {
		const newLevel = item.system.level.value + increment;
		await item.update({ 'system.level.value': newLevel });
	}

	/**
	 * Resets the progress clock.
	 * @param {HTMLInputElement} input - The input change event.
	 * @param {'feature'} [dataType] is the item a feature
	 * @param {string} [dataPath] path to clock data
	 * @private
	 */
	_onProgressReset(input, dataType, dataPath) {
		const li = input.closest('[data-item-id]');

		if (li) {
			// If the clock is from an item
			const itemId = li.dataset.itemId;
			const item = this.actor.items.get(itemId);

			if (dataPath) {
				item.update({ [dataPath + '.current']: 0 });
			} else if (dataType === 'feature') {
				item.update({ 'system.data.progress.current': 0 });
			} else {
				item.update({ 'system.progress.current': 0 });
			}
		} else {
			// If not from an item
			this.actor.update({ 'system.progress.current': 0 });
		}
	}

	/////////////////////
	// ACTION HANDLERS //
	/////////////////////

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async Roll(event, target) {
		event.preventDefault();
		const dataset = target.dataset;
		const modifiers = HTMLUtils.getKeyboardModifiers(event);
		// Get the value of optionTargetPriorityRules from game settings
		const settingPriority = game.settings.get('projectfu', 'optionTargetPriorityRules');

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = target.closest('[data-item-id]').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) {
					if (modifiers.ctrl) {
						return new ItemCustomizer(this.actor, item).render(true);
					} else {
						if (settingPriority && this.actor?.type === 'npc') {
							BehaviorRoll.targetPriority(this.actor);
						}
						return item.roll(modifiers);
					}
				}
			}
			if (dataset.rollType === 'behavior') {
				return BehaviorRoll.rollBehavior(this);
			}

			if (dataset.rollType === 'roll-check') {
				return CheckPrompt.attributeCheck(this.actor);
			}

			if (dataset.rollType === 'open-check') {
				return CheckPrompt.openCheck(this.actor);
			}

			if (dataset.rollType === 'roll-init' || (dataset.rollType === 'group-check' && modifiers.shift)) {
				return Checks.groupCheck(this.actor, GroupCheckV2.initInitiativeCheck);
			}

			if (dataset.rollType === 'group-check') {
				return CheckPrompt.groupCheck(this.actor);
			}
		}

		// Handle item-slot rolls using the new equip structure.
		if (dataset.rollType === 'item-slot') {
			// Get the actor's equipped data
			const equippedData = this.actor.system.equipped;
			const slotMap = {
				'left-hand': 'mainHand',
				'right-hand': 'offHand',
				'two-hand': 'mainHand',
				'phantom-hand': 'phantom',
				'acc-hand': 'accessory',
				'armor-hand': 'armor',
			};

			// Find the first matching slot class or default to 'default'
			const slot = Object.keys(slotMap).find((className) => target.classList.contains(className)) || 'default';
			const itemId = equippedData[slotMap[slot]]; // Use the mapped slot

			const item = this.actor.items.get(itemId);

			// Check if the item exists and call its roll method
			if (item) {
				return item.roll(modifiers);
			}
		}

		// Handle affinity-type rolls
		if (dataset.rollType === 'affinity-type') {
			Checks.display(this.actor, null, (check) => {
				check.additionalData[affinityKey] = dataset.affinity;
			});
			return;
		}

		// Handle rolls that supply the formula directly.
		if (dataset.roll) {
			const label = dataset.label ? `${dataset.label}` : '';
			const roll = new Roll(dataset.roll, this.actor.getRollData());
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				flavor: label,
				rollMode: game.settings.get('core', 'rollMode'),
			});
			return roll;
		}
	}

	static SpendMetaCurrency(e, elem) {
		PlayerListEnhancements.spendMetaCurrency(this.actor);
	}

	static async StudyAction(e, elem) {
		await new StudyRollHandler(this.actor).handleStudyRoll();
	}

	static async PerformAction(e, elem) {
		const isShift = e.shiftKey;
		const actionHandler = new ActionHandler(this.actor);
		await actionHandler.handleAction(elem.dataset.type, isShift);
	}

	static ToggleStatusEffect(e, elem) {
		Effects.toggleStatusEffect(this.actor, elem.dataset.statusId, InlineSourceInfo.fromInstance(this.actor));
	}

	/**
	 * @description Handles the event when the "Use Equipment" checkbox is clicked.
	 * If the checkbox is unchecked, it unequips all equipped items in the actor's inventory.
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} ev   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static ToggleUseEquipment(ev, target) {
		const isChecked = target.checked;

		if (!isChecked) {
			// Get the actor's item collection
			const itemCollection = this.actor.items;

			// Iterate over each item in the collection
			itemCollection.forEach((item) => {
				if (item.system && item.system.isEquipped && item.system.isEquipped.value === true) {
					// Update the item to set 'system.isEquipped.value' to false
					item.update({
						'system.isEquipped.value': false,
						'system.isEquipped.slot': 'default',
					});
				}
			});
			// Log a message or perform other actions if needed
		} else {
			// Checkbox is checked
		}
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async ToggleItemFavored(event, target) {
		const itemEl = target.closest('.item');
		if (!itemEl) {
			return;
		}

		const itemId = itemEl.dataset.itemId;
		const item = this.actor.items.get(itemId);
		if (!item) {
			return;
		}

		const isFavoredBool = item.system.isFavored?.value ?? false;
		await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isFavored.value': !isFavoredBool }]);
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static ZenitTransfer(event, target) {
		InventoryPipeline.promptPartyZenitTransfer(this.actor, target.dataset.zenitAction);
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async CrisisHP(event, target) {
		const maxHP = this.actor.system.resources.hp.max;
		const crisisHP = Math.floor(maxHP / 2);
		const updateData = {
			'system.resources.hp.value': crisisHP,
		};
		await this.actor.update(updateData);
		this.actor.sheet.render(true);
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async AddBond(event, target) {
		const bonds = this.actor.system.bonds;
		const maxBondLength = game.settings.get('projectfu', 'optionBondMaxLength');
		if (bonds.length >= maxBondLength) {
			// TODO Probably add this to i18n
			ui.notifications.warn(`Maximum number of bonds (${maxBondLength}) reached.`);
			return;
		}

		const newBonds = [...bonds];
		newBonds.push({ name: '', admInf: '', loyMis: '', affHat: '' });
		await this.actor.update({ 'system.bonds': newBonds });
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async DeleteBond(event, target) {
		const bondIndex = Number(target.dataset.bondIndex);
		const newBonds = [...this.actor.system.bonds];
		newBonds.splice(bondIndex, 1);
		await this.actor.update({ 'system.bonds': newBonds });
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async UpdateProgress(event, target) {
		const rightClick = event.which === 3 || event.button === 2;
		const { itemId, updateAmount, dataPath } = target.dataset;

		const item = this.actor.items.get(itemId);
		const increment = parseFloat(updateAmount);
		await ProgressDataModel.updateForDocument(item, dataPath, increment, rightClick);
	}

	/**
	 * Updates the progress clock value based on the clicked segment.
	 * @param {HTMLElement} input - The input element
	 * @param {'feature'} [dataType] Is the item a feature
	 * @param {string} [dataPath] path to clock data
	 * @private
	 */
	_onProgressUpdate(input, dataType, dataPath) {
		const segment = input.value;
		if (!segment) {
			throw Error('Segment element not properly retrieved from input event');
		}
		const li = input.closest('[data-item-id]');

		if (li) {
			// If the clock is from an item
			const itemId = li.dataset.itemId;
			const item = this.actor.items.get(itemId);

			if (dataPath) {
				item.update({ [dataPath + '.current']: segment });
			} else if (dataType === 'feature') {
				item.update({ 'system.data.progress.current': segment });
			} else {
				item.update({ 'system.progress.current': segment });
			}
		} else {
			this.actor.update({ 'system.progress.current': segment });
		}
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static sortFavorites(event, target) {
		if (event.button === 2) {
			// Right-click: change sort type
			this.changeSortType();
		} else {
			// Left-click: toggle ascending/descending
			this.sortOrder *= -1;
			this.render();
		}
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {void}
	 */
	static levelUp(event, target) {
		const {
			level: { value: level },
			resources: {
				exp: { value: exp },
			},
		} = this.actor.system;

		if (exp < 10) {
			return;
		}

		const $icon = $(target).css('position', 'relative');
		$icon.animate({ top: '-100%', opacity: 0 }, 500, () => {
			$icon.remove();
			this.actor.update({
				'system.resources.exp.value': exp - 10,
				'system.level.value': level + 1,
			});
		});
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static updateArcanistArcanum(event, target) {
		const itemId = target.dataset.itemId;
		const currentArcanumId = this.actor.system.equipped.arcanum;
		// Toggle arcanum slot
		const newArcanumId = currentArcanumId === itemId ? null : itemId;
		this.actor.update({
			'system.equipped.arcanum': newArcanumId,
		});
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static toggleActiveGarden(event, target) {
		const itemId = target.dataset.itemId;
		const item = this.actor.items.get(itemId);
		return this.actor.system.floralist.toggleActiveGarden(item);
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static togglePlantedMagiseed(event, target) {
		const itemId = target.dataset.itemId;
		const item = this.actor.items.get(itemId);
		return this.actor.system.floralist.togglePlantedMagiseed(item);
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static updatePilotVehicle(event, target) {
		const item = this.actor.items.get(target.dataset.itemId);
		const func = target.dataset.func;
		this.actor.update({
			'system.vehicle': this.actor.system.vehicle[func](item),
		});
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async equipItem(event, target) {
		event.preventDefault();
		this.#equipmentHandler.handleItemClick(event, target);
	}

	static modifyResource(event, target) {
		let document;
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		if (itemId) {
			document = this.actor.items.get(itemId);
		} else {
			const effectId = target.closest('[data-effect-id]')?.dataset?.effectId;
			document = this.actor.effects.get(effectId);
		}
		const dataPath = target.closest('[data-data-path]')?.dataset?.dataPath;
		const resourceChange = target.closest('[data-resource-action]')?.dataset?.resourceAction === 'decrement' ? -1 : 1;
		const amount = (Number(target.closest('[data-amount]')?.dataset?.amount) || 1) * resourceChange;

		const step = event.button !== 0;

		ProgressDataModel.updateForDocument(document, dataPath, amount, step);
	}

	static modifyClassLevel(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		const classItem = this.actor.items.get(itemId);
		const change = target.closest('[data-level-action]')?.dataset?.levelAction === 'decrement' ? -1 : 1;

		if (!classItem || classItem.type !== 'class') {
			return;
		}

		const { value, min, max } = classItem.system.level;
		const newValue = value + change;

		classItem.update({
			'system.level.value': Math.clamp(newValue, min, max),
		});
	}

	/**
	 * @this FUStandardActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static ClearTempEffects(event, target) {
		event.preventDefault();
		const actor = this.actor;
		if (!actor || !actor.system || !actor.system.immunities) {
			return;
		}
		actor.clearTemporaryEffects();
	}

	// TODO: Re-use with the ones from item sheet?
	/* -------------------------------------------- */

	// ACTIVE EFFECTS
	static CreateEffect(event, target) {
		onManageActiveEffect(event, this.actor, 'create');
	}

	static EditEffect(event, target) {
		onManageActiveEffect(event, this.actor, 'edit');
	}

	static DeleteEffect(event, target) {
		onManageActiveEffect(event, this.actor, 'delete');
	}

	static CopyInline(event, target) {
		onManageActiveEffect(event, this.actor, 'copy-inline');
	}

	static ToggleEffect(event, target) {
		onManageActiveEffect(event, this.actor, 'toggle');
	}

	static RollEffect(event, target) {
		onManageActiveEffect(event, this.actor, 'roll');
	}

	/* -------------------------------------------- */
}
