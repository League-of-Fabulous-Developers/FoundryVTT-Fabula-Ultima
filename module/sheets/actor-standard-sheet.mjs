import { Effects, isActiveEffectForStatusEffectId, onManageActiveEffect } from '../pipelines/effects.mjs';
import { createChatMessage, promptCheck, promptOpenCheck } from '../helpers/checks.mjs';
import { ItemCustomizer } from '../helpers/item-customizer.mjs';
import { ActionHandler } from '../helpers/action-handler.mjs';
import { EquipmentHandler } from '../helpers/equipment-handler.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { SETTINGS } from '../settings.js';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { ChecksV2 } from '../checks/checks-v2.mjs';
import { GroupCheck as GroupCheckV2 } from '../checks/group-check.mjs';
import { InlineHelper, InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { CollectionUtils } from '../helpers/collection-utils.mjs';
import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { PlayerListEnhancements } from '../helpers/player-list-enhancements.mjs';

const TOGGLEABLE_STATUS_EFFECT_IDS = ['crisis', 'slow', 'dazed', 'enraged', 'dex-up', 'mig-up', 'ins-up', 'wlp-up', 'guard', 'weak', 'shaken', 'poisoned', 'dex-down', 'mig-down', 'ins-down', 'wlp-down'];

/**
 * @description Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class FUStandardActorSheet extends ActorSheet {
	constructor(...args) {
		super(...args);

		// Initialize sortOrder
		this.sortOrder = 1;
	}

	/** @override */
	static get defaultOptions() {
		const defaultOptions = super.defaultOptions;
		return foundry.utils.mergeObject(defaultOptions, {
			classes: ['projectfu', 'sheet', 'actor', 'backgroundstyle'],
			template: 'systems/projectfu/templates/actor/actor-character-sheet.hbs',
			width: 750,
			height: 1000,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'stats',
				},
			],
			scrollY: ['.sheet-body'],
			dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
		});
	}

	/** @override */
	get template() {
		const type = this.actor.type;
		const wl = ['character', 'npc'];
		if (!game.user.isGM && !this.actor.testUserPermission(game.user, 'OBSERVER') && wl.includes(type)) {
			return `systems/projectfu/templates/actor/actor-${type}-limited-sheet.hbs`;
		}
		return `systems/projectfu/templates/actor/actor-${type}-sheet.hbs`;
	}

	/* -------------------------------------------- */

	/** @override */
	async getData() {
		// Retrieve the data structure from the base sheet. You can inspect or log
		// the context variable to see the structure, but some key properties for
		// sheets are the actor object, the data object, whether or not it's
		// editable, the items array, and the effects array.
		const context = super.getData();

		// Use a safe clone of the actor data for further operations.
		const actorData = this.actor;

		// Model agnostic
		await ActorSheetUtils.prepareData(context, this);

		// For characters/npcs
		this._prepareCharacterData(context);

		// Prepare character data and items.
		if (actorData.type === 'character') {
			context.tlTracker = this.actor.tlTracker;
		}

		// Prepare NPC data and items.
		if (actorData.type === 'npc') {
			context.spTracker = this.actor.spTracker;
		}

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

		// Sort the items array in-place based on the current sorting method
		let sortFn = this.sortByOrder;
		if (this.sortMethod === 'name') {
			sortFn = this.sortByName;
		} else if (this.sortMethod === 'type') {
			sortFn = this.sortByType;
		}
		sortFn = sortFn.bind(this);
		context.items.sort(sortFn);
		Object.keys(context.classFeatures).forEach((k) => (context.classFeatures[k].items = Object.fromEntries(Object.entries(context.classFeatures[k].items).sort((a, b) => sortFn(a[1].item, b[1].item)))));
		Object.keys(context.optionalFeatures).forEach((k) => (context.optionalFeatures[k].items = Object.fromEntries(Object.entries(context.optionalFeatures[k].items).sort((a, b) => sortFn(a[1].item, b[1].item)))));

		// Add roll data for TinyMCE editors.
		context.rollData = context.actor.getRollData();

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

		// Enriches description fields within the context object
		context.enrichedHtml = {
			description: await TextEditor.enrichHTML(context.system.description ?? '', {
				secrets: this.actor.isOwner,
				rollData: context.actor.getRollData(),
				relativeTo: context.actor,
			}),
		};

		const studyRollTiers = game.settings.get(SYSTEM, SETTINGS.useRevisedStudyRule) ? FU.studyRoll.revised : FU.studyRoll.core;
		let studyRoll;
		studyRoll = studyRollTiers.map((value) => value + '+');
		studyRoll.unshift('-');
		studyRoll = studyRoll.reduce((agg, curr, idx) => (agg[idx] = curr) && agg, {});

		context.studyRoll = studyRoll;

		context.FU = FU;

		// Prepare NPC Companion Data
		if (actorData.type === 'npc') {
			if (actorData.system.rank.value === 'companion' || actorData.system.rank.value === 'custom') {
				// Populate the dropdown with owned actors
				context.ownedActors = game.actors.filter((a) => a.type === 'character' && a.testUserPermission(game.user, 'OWNER'));

				// Check if a refActor is selected
				const refActor = context.system.references.actor;
				context.refActorLevel = refActor ? refActor.system.level.value : 0;

				if (refActor) {
					// Filter skills associated with the refActor
					context.availableSkills = refActor.items.filter((item) => item.type === 'skill');

					// Retrieve the selected referenceSkill by UUID
					context.refSkill = context.system.references.skill ? context.availableSkills.find((skill) => skill.uuid === context.system.references.skill) : null;
					context.refSkillLevel = context.refSkill ? context.refSkill.system.level.value || 0 : 0;
				} else {
					// No referencePlayer selected, clear skills and selected skill
					context.availableSkills = [];
					context.refSkill = null;
					context.refSkillLevel = 0;
				}
			}
		}

		return context;
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareCharacterData(context) {
		if (!context || !context.system || !context.system.attributes || !context.system.affinities) {
			console.error('Invalid context or context.system');
			return;
		}

		// Handle ability scores.
		for (let [k, v] of Object.entries(context.system.attributes)) {
			v.label = game.i18n.localize(CONFIG.FU.attributes[k]) ?? k;
			v.abbr = game.i18n.localize(CONFIG.FU.attributeAbbreviations[k]) ?? k;
		}

		// Handle affinity
		for (let [k, v] of Object.entries(context.system.affinities)) {
			v.label = game.i18n.localize(CONFIG.FU.damageTypes[k]) ?? k;
			v.affTypeBase = game.i18n.localize(CONFIG.FU.affType[v.base]) ?? v.base;
			v.affTypeBaseAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.base]) ?? v.base;
			v.affTypeCurr = game.i18n.localize(CONFIG.FU.affType[v.current]) ?? v.current;
			v.affTypeCurrAbbr = game.i18n.localize(CONFIG.FU.affTypeAbbr[v.current]) ?? v.current;
			v.icon = CONFIG.FU.affIcon[k];
		}

		// Handle immunity
		for (let [k, v] of Object.entries(context.system.immunities)) {
			v.label = game.i18n.localize(CONFIG.FU.temporaryEffects[k]) ?? k;
		}
	}

	/* -------------------------------------------- */

	async _onDrop(ev) {
		ev.preventDefault();

		// Retrieve drag data using TextEditor
		const data = TextEditor.getDragEventData(ev);
		if (!data || data.type !== 'Item') return await super._onDrop(ev);

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
			const formattedEffects = effects.map((effect) => this._formatEffect(effect)).join(' ');

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

	// Helper function to generate the @EFFECT format string
	_formatEffect(effect) {
		const encodedEffect = InlineHelper.toBase64(effect);
		return `@EFFECT[${encodedEffect}]`;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		ActorSheetUtils.activateDefaultListeners(html, this);

		html.on('mouseup', '.effect', this._onMiddleClickEditEffect.bind(this)); // Middle-click to edit effect
		html.on('click', '.effect-roll', (ev) => onManageActiveEffect(ev, this.actor)); // Send active effect to chat
		html.on('click', '.study-button', async () => await new StudyRollHandler(this.actor).handleStudyRoll());
		html.find('.effect-control').click((ev) => onManageActiveEffect(ev, this.actor)); // Active Effect management

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Editable item actions
		ActorSheetUtils.activateInventoryListeners(html, this);
		html.on('click', '.use-equipment', this._onUseEquipment.bind(this)); // Toggle use equipment setting for npcs
		html.on('click', '.item-favored', this._onItemFavorite.bind(this)); // Add item to favorites
		html.on('click', '.item-behavior', (ev) => this._onItemBehavior($(ev.currentTarget))); // Add item to behavior roll
		html.on('click', '.zenit-deposit', async (ev) => {
			return InventoryPipeline.promptPartyZenitTransfer(this.actor, 'deposit');
		});
		html.on('click', '.zenit-withdraw', async (ev) => {
			return InventoryPipeline.promptPartyZenitTransfer(this.actor, 'withdraw');
		});
		html.on('click contextmenu', '.increment-button', (ev) => this._onIncrementButtonClick(ev)); // Increment value
		html.on('click contextmenu', '.decrement-button', (ev) => this._onDecrementButtonClick(ev)); // Decrement value
		html.on('click', '.is-levelup', (ev) => this._onLevelUp(ev)); // Handle level up
		html.on('click', '.skillLevel input', (ev) => this._onSkillLevelUpdate(ev)); // Update skill level
		html.on('contextmenu', '.skillLevel', (ev) => this._onSkillLevelReset(ev)); // Reset skill level

		// Update Progress Increase
		html.find('.progress input').click((ev) => {
			const dataType = $(ev.currentTarget).closest('.progress').data('type');
			const dataPath = $(ev.currentTarget).closest('.progress').data('dataPath');
			this._onProgressUpdate(ev, dataType, dataPath);
		});

		// Update Progress Reset
		html.find('.progress input').contextmenu((ev) => {
			const dataType = $(ev.currentTarget).closest('.progress').data('type');
			const dataPath = $(ev.currentTarget).closest('.progress').data('dataPath');
			this._onProgressReset(ev, dataType, dataPath);
		});

		// Create an instance of EquipmentHandler
		const eh = new EquipmentHandler(this.actor);

		// Add event listeners for handling equipping items
		html.find('.item-equip').on({
			click: (ev) => eh.handleItemClick(ev, 'left'),
			contextmenu: (ev) => eh.handleItemClick(ev, 'right'),
			mousedown: (ev) => ev.ctrlKey && ev.which === 1 && (eh.handleItemClick(ev, 'ctrl'), ev.preventDefault()),
		});

		// Toggle status effects
		html.find('.status-effect-toggle').click((ev) => {
			ev.preventDefault();
			const a = ev.currentTarget;
			Effects.toggleStatusEffect(this.actor, a.dataset.statusId, InlineSourceInfo.fromInstance(this.actor));
		});

		// Rollable abilities.
		html.find('.rollable').click(this._onRoll.bind(this));

		// Rest on left-click, different behavior on right-click
		html.find('.rest').on('click contextmenu', (ev) => this.handleRestClick(ev));

		// Event listener for setting hp to crisis
		async function hpCrisis(actor) {
			const maxHP = actor.system.resources.hp.max;
			// It's supposed to round down. EG: 51 -> 25, not 26.
			const crisisHP = Math.floor(maxHP / 2);

			const updateData = {
				'system.resources.hp.value': crisisHP,
			};

			await actor.update(updateData);
			actor.sheet.render(true);
		}

		html.find('.crisisHP').on('click', async (ev) => {
			await hpCrisis(this.actor);
		});

		// Event listener for adding a new bonds
		html.find('.bond-add').click(async (ev) => {
			ev.preventDefault();
			const bonds = this.actor.system.bonds;
			const maxBondLength = game.settings.get('projectfu', 'optionBondMaxLength');
			if (bonds.length >= maxBondLength) {
				ui.notifications.warn(`Maximum number of bonds (${maxBondLength}) reached.`);
				return;
			}
			const newBonds = [...bonds];
			newBonds.push({
				name: '',
				admInf: '',
				loyMis: '',
				affHat: '',
			});
			await this.actor.update({ 'system.bonds': newBonds });
		});

		// Event listener for deleting a bond
		html.find('.bond-delete').click(async (ev) => {
			ev.preventDefault();
			const bondIndex = $(ev.currentTarget).data('bond-index');
			const newBonds = [...this.actor.system.bonds];
			newBonds.splice(bondIndex, 1);
			await this.actor.update({ 'system.bonds': newBonds });
		});

		const sortButton = html.find('#sortButton');

		sortButton.mousedown((ev) => {
			// Right click changes the sort type
			if (ev.button === 2) {
				this.changeSortType();
			} else {
				// Left click switches between ascending and descending order
				this.sortOrder *= -1;
				this.render();
			}
		});

		// Load sorting method from actor flags
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

		const updatePilotVehicle = (func) => {
			return (ev) => {
				const item = this.actor.items.get(ev.currentTarget.dataset.itemId);
				this.actor.update({
					'system.vehicle': this.actor.system.vehicle[func](item),
				});
			};
		};

		html.find('.vehicle-section [data-action=toggleVehicleEmbarked]').on('click', updatePilotVehicle('updateEmbarked').bind(this));
		html.find('[data-action=toggleActiveVehicle][data-item-id]').on('click', updatePilotVehicle('updateActiveVehicle').bind(this));
		html.find('[data-action=toggleArmorModule][data-item-id]').on('click', updatePilotVehicle('updateActiveArmorModule').bind(this));
		html.find('[data-action=toggleWeaponModule][data-item-id]').on('click', updatePilotVehicle('updateActiveWeaponModules').bind(this));
		html.find('[data-action=toggleSupportModule][data-item-id]').on('click', updatePilotVehicle('updateActiveSupportModules').bind(this));

		const updateArcanistArcanum = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const currentArcanumId = this.actor.system.equipped.arcanum;

			// Check if the clicked item is already the active arcanum
			const newArcanumId = currentArcanumId === itemId ? null : itemId;

			// Update the arcanum slot
			this.actor.update({
				'system.equipped.arcanum': newArcanumId,
			});
		};

		html.find('[data-action=toggleActiveArcanum][data-item-id]').on('click', updateArcanistArcanum.bind(this));

		const toggleActiveGarden = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const item = this.actor.items.get(itemId);

			return this.actor.system.floralist.toggleActiveGarden(item);
		};
		html.find('[data-action=toggleActiveGarden][data-item-id]').on('click', toggleActiveGarden.bind(this));

		const togglePlantedMagiseed = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const item = this.actor.items.get(itemId);

			return this.actor.system.floralist.togglePlantedMagiseed(item);
		};
		html.find('[data-action=togglePlantedMagiseed][data-item-id]').on('click', togglePlantedMagiseed.bind(this));
		html.find('a[data-action=spendMetaCurrency]').on('click', () => PlayerListEnhancements.spendMetaCurrency(this.actor));
		html.find('span[data-action="clearTempEffects"]').click(this._onClearTempEffects.bind(this));

		// Dropzone event listeners
		const dropZone = html.find('.desc.drop-zone');
		dropZone.on('dragenter', this._onDragEnter.bind(this));
		dropZone.on('dragleave', this._onDragLeave.bind(this));
		dropZone.on('drop', this._onDropReset.bind(this));
	}

	// Handle adding item to favorite
	async _onItemFavorite(ev) {
		const li = $(ev.currentTarget).parents('.item');
		const itemId = li.data('itemId');
		const item = this.actor.items.get(itemId);
		const isFavoredBool = item.system.isFavored.value;
		item.update();
		this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isFavored.value': !isFavoredBool }]);
	}

	// Handle middle-click to open active effect dialog
	_onMiddleClickEditEffect(ev) {
		const owner = this.actor;
		if (ev.button === 1 && !$(ev.target).hasClass('effect-control')) {
			const li = $(ev.currentTarget);
			const simulatedEvent = {
				preventDefault: () => {},
				currentTarget: {
					dataset: { action: 'edit' },
					closest: () => li[0],
					classList: {
						contains: (cls) => li.hasClass(cls),
					},
				},
			};

			onManageActiveEffect(simulatedEvent, owner);
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

	_onClearTempEffects(ev) {
		ev.preventDefault();
		const actor = this.actor;

		if (!actor || !actor.system || !actor.system.immunities) return;

		actor.clearTemporaryEffects();
	}

	sortByOrder(a, b) {
		return this.sortOrder * (a.sort || 0) - this.sortOrder * (b.sort || 0);
	}

	sortByName(a, b) {
		const nameA = a.name.toUpperCase();
		const nameB = b.name.toUpperCase();
		return this.sortOrder * nameA.localeCompare(nameB);
	}

	sortByType(a, b) {
		const typeA = a.type.toUpperCase();
		const typeB = b.type.toUpperCase();
		return this.sortOrder * typeA.localeCompare(typeB);
	}

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
	 * Handles the event when the "Use Equipment" checkbox is clicked.
	 * If the checkbox is unchecked, it unequips all equipped items in the actor's inventory.
	 *
	 * @param {Event} ev - The click ev triggering the "Use Equipment" checkbox.
	 * @returns {void} The function does not return a promise.
	 */
	async _onUseEquipment(ev) {
		const checkbox = ev.currentTarget;
		const isChecked = checkbox.checked;

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

	// Handle the rest action click events
	async handleRestClick(ev) {
		ev.preventDefault();
		const isRightClick = ev.type === 'contextmenu';
		await this.onRest(this.actor, isRightClick);
	}

	// TODO: Move out of here
	/**
	 * @description Handle resting actions for the actor, restoring health and possibly other resources.
	 * @param {Actor} actor - The actor performing the rest action.
	 * @param {boolean} isRightClick - Indicates if the rest action is triggered by a right-click.
	 * @returns {Promise<void>} A promise that resolves when the rest action is complete.
	 */
	async onRest(actor, isRightClick) {
		const maxHP = actor.system.resources.hp?.max;
		const maxMP = actor.system.resources.mp?.max;
		const maxIP = actor.system.resources.ip?.max;

		// Prepare the update data using mergeObject to avoid overwriting other fields
		let updateData = foundry.utils.mergeObject(actor.toObject(false), {
			'system.resources.hp.value': maxHP,
			'system.resources.mp.value': maxMP,
		});

		if (isRightClick) {
			updateData = foundry.utils.mergeObject(updateData, {
				'system.resources.ip.value': maxIP,
			});
		}

		// Update the actor
		await actor.update(updateData);

		// Dispatch the event
		CommonEvents.rest(actor);

		// Rerender the actor's sheet if necessary
		if (isRightClick || updateData['system.resources.ip.value']) {
			actor.sheet.render(true);
		}
	}

	/**
	 * Rolls a random behavior for the given actor and displays the result in a chat message.
	 *
	 * @returns {void}
	 */
	_rollBehavior() {
		// Filter items in the actor's inventory to find behaviors
		const behaviors = this.actor.items.filter((item) => ['basic', 'weapon', 'shield', 'armor', 'accessory', 'spell', 'miscAbility', 'behavior'].includes(item.type) && item.system.isBehavior?.value);

		// Prepare an array to map behaviors with their weights
		const behaviorMap = [];

		// Populate the behaviorMap based on behavior weights
		behaviors.forEach((behavior) => {
			const weight = behavior.system.weight.value;
			const nameVal = behavior.name;
			const descVal = behavior.system.description;
			const idVal = behavior.id;

			for (let i = 0; i < weight; i++) {
				behaviorMap.push({
					name: nameVal,
					desc: descVal,
					id: idVal,
				});
			}
		});

		// Check if there are behaviors to choose from
		if (behaviorMap.length === 0) {
			console.error('No behavior selected.');
			return;
		}

		// Randomly select a behavior from the behaviorMap
		const randVal = Math.floor(Math.random() * behaviorMap.length);
		const selected = behaviorMap[randVal];

		// Get the item from the actor's items by id
		const item = this.actor.items.get(selected.id); // Use "this.actor" to access the actor's items

		if (item) {
			// Call the item's roll method
			item.roll();
		}

		// Call _targetPriority method passing the selected behavior
		this._targetPriority(selected);

		// Check if the selected behavior's type is "item"
		if (selected.type === 'item') {
			// Get the item from the actor's items by id

			const item = this.actor.items.get(selected.id);
			// Check if the item exists
			if (item) {
				// Return the result of item.roll()
				item._onRoll.bind(this);
			}
		}
	}

	_targetPriority(selected) {
		// Get the array of targeted tokens
		let targetedTokens = Array.from(game.user.targets);

		// Define the content variable
		let content;

		// Extract the name of the selected behavior
		const behaviorName = selected ? selected.name : '';

		if (targetedTokens.length > 0) {
			// Map targeted tokens to numbered tokens with actor names
			const numberedTokens = targetedTokens.map((token, index) => `${index + 1} (${token.actor.name})`);

			// Shuffle the array of numbered tokens
			CollectionUtils.shuffleArray(numberedTokens);

			// Prepare the content for the chat message
			content = `<b>Actor:</b> ${this.actor.name}${behaviorName ? `<br /><b>Selected behavior:</b> ${behaviorName}` : ''}<br /><b>Target priority:</b> ${numberedTokens.join(' -> ')}`;
		} else {
			// Get the value of optionTargetPriority from game settings
			const settingValue = game.settings.get('projectfu', 'optionTargetPriority');

			// Prepare an array for target priority with a length equal to settingValue
			const targetArray = Array.from({ length: settingValue }, (_, index) => index + 1);

			// Shuffle the array of numbered tokens
			CollectionUtils.shuffleArray(targetArray);

			// Prepare the content for the chat message
			content = `<b>Actor:</b> ${this.actor.name}${behaviorName ? `<br /><b>Selected behavior:</b> ${behaviorName}` : ''}<br /><b>Target priority:</b> ${targetArray.join(' -> ')}`;
		}

		// Prepare chat data for displaying the message
		const chatData = {
			user: game.user._id,
			speaker: ChatMessage.getSpeaker(),
			whisper: game.user._id,
			content,
		};

		// Create a chat message with the chat data
		ChatMessage.create(chatData);
	}

	/**
	 * Handles the level up action when clicked.
	 *
	 * @param {Event} ev - The input change event.
	 */
	_onLevelUp(ev) {
		const input = ev.currentTarget;
		const actor = this.actor;
		if (!actor) return;

		const exp = actor.system.resources.exp.value;
		if (exp < 10) return;

		const { level } = actor.system;
		const $icon = $(input).css('position', 'relative');
		$icon.animate({ top: '-100%', opacity: 0 }, 500, function () {
			actor.update({
				'system.resources.exp.value': exp - 10,
				'system.level.value': level.value + 1,
			});
			$icon.remove();
		});
	}

	/**
	 * Sets the skill level value to the segment clicked.
	 *
	 * @param {Event} ev - The input change event.
	 */
	_onSkillLevelUpdate(ev) {
		const input = ev.currentTarget;
		const segment = input.value;

		const li = $(input).closest('.item');

		if (li.length) {
			const itemId = li.find('input').data('item-id');
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
	 * Resets the skill level value to 0 on right-click.
	 *
	 * @param {Event} ev - The context menu event.
	 */
	_onSkillLevelReset(ev) {
		ev.preventDefault();

		const input = ev.currentTarget;
		const li = $(input).closest('.item');

		if (li.length) {
			const itemId = li.find('input').data('item-id');
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

	/**
	 * Handles button click events to update item level or resource progress.
	 * @param {Event} ev - The button click event.
	 * @param {number|string} increment - The value by which to increment or decrement the item level or resource progress.
	 * @param {string} dataType - The type of data ('levelCounter', 'resourceCounter', 'clockCounter', or 'projectCounter').
	 * @param {boolean} rightClick - Indicates whether the click is a right click.
	 * @private
	 */
	async _onButtonClick(ev, increment, dataType, rightClick) {
		const button = ev.currentTarget;
		const li = $(button).closest('.item');

		try {
			if (li.length) {
				const itemId = li.find('[data-item-id]').data('item-id');
				const item = this.actor.items.get(itemId);
				const dataPath = ev.currentTarget.dataset.dataPath;

				if (item) {
					switch (dataType) {
						case 'levelCounter':
							await this._updateLevel(item, increment);
							break;

						case 'resourceCounter':
							await this._updateResourceProgress(item, increment, rightClick);
							break;

						case 'clockCounter':
							await this._updateClockProgress(item, increment, rightClick, dataPath);
							break;
						case 'optionalRPCounter':
							await this._updateOptionalRPProgress(item, increment, rightClick);
							break;
						case 'featureCounter':
							await this._updateFeatureProgress(item, increment, rightClick);
							break;
						case 'projectCounter':
							await this._updateProjectProgress(item, increment, rightClick);
							break;

						default:
							console.error('Invalid data-type:', dataType);
							break;
					}
				} else {
					console.error(`Item with ID ${itemId} not found.`);
				}
			}
		} catch (error) {
			console.error(`Error updating item ${dataType === 'levelCounter' ? 'level' : 'rp progress'}:`, error);
		}
	}

	async _updateLevel(item, increment) {
		const newLevel = item.system.level.value + increment;
		await item.update({ 'system.level.value': newLevel });
	}

	async _updateResourceProgress(item, increment, rightClick) {
		const stepMultiplier = item.system.rp.step || 1;
		const maxProgress = item.system.rp.max;
		let newProgress;

		if (rightClick) {
			newProgress = item.system.rp.current + increment * stepMultiplier;
		} else {
			newProgress = item.system.rp.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		await item.update({ 'system.rp.current': newProgress });
	}

	/**
	 * @param {FUItem} item
	 * @param {number} increment
	 * @param {boolean} rightClick
	 * @param {string} [dataPath]
	 * @returns {Promise<void>}
	 * @private
	 */
	async _updateClockProgress(item, increment, rightClick, dataPath = 'system.progress') {
		/** @type ProgressDataModel */
		const progress = foundry.utils.getProperty(item, dataPath);

		const stepMultiplier = progress.step || 1;
		const maxProgress = progress.max;
		let newProgress;

		if (rightClick) {
			newProgress = progress.current + increment * stepMultiplier;
		} else {
			newProgress = progress.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		await item.update({ [dataPath + '.current']: newProgress });
	}

	async _updateOptionalRPProgress(item, increment, rightClick) {
		const stepMultiplier = item.system.data.rp.step || 1;
		const maxProgress = item.system.data.rp.max;
		let newProgress;

		if (rightClick) {
			newProgress = item.system.data.rp.current + increment * stepMultiplier;
		} else {
			newProgress = item.system.data.rp.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		await item.update({ 'system.data.rp.current': newProgress });
	}

	async _updateFeatureProgress(item, increment, rightClick) {
		const stepMultiplier = item.system.data.progress.step || 1;
		const maxProgress = item.system.data.progress.max;
		let newProgress;

		if (rightClick) {
			newProgress = item.system.data.progress.current + increment * stepMultiplier;
		} else {
			newProgress = item.system.data.progress.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		await item.update({ 'system.data.progress.current': newProgress });
	}

	async _updateProjectProgress(item, increment, rightClick) {
		const progressPerDay = item.system.progressPerDay.value || 1;
		const maxProjectProgress = item.system.progress.max;
		let currentProgress;

		if (rightClick) {
			currentProgress = item.system.progress.current + increment * progressPerDay;
		} else {
			currentProgress = item.system.progress.current + increment;
		}

		if (maxProjectProgress !== 0) {
			currentProgress = Math.min(currentProgress, maxProjectProgress);
		}

		await item.update({ 'system.progress.current': currentProgress });
	}

	/**
	 * Handles increment button click events for both level and resource progress.
	 * @param {Event} ev - The button click event.
	 * @private
	 */
	_onIncrementButtonClick(ev) {
		ev.preventDefault();
		const dataType = $(ev.currentTarget).data('type');
		const rightClick = ev.which === 3 || ev.button === 2;
		this._onButtonClick(ev, 1, dataType, rightClick);
	}

	/**
	 * Handles decrement button click events for both level and resource progress.
	 * @param {Event} ev - The button click event.
	 * @private
	 */
	_onDecrementButtonClick(ev) {
		ev.preventDefault();
		const dataType = $(ev.currentTarget).data('type');
		const rightClick = ev.which === 3 || ev.button === 2;
		this._onButtonClick(ev, -1, dataType, rightClick);
	}

	/**
	 * Updates the progress clock value based on the clicked segment.
	 * @param {Event} ev - The input change event.
	 * @param {"feature"} [dataType] is the item a feature
	 * @param {string} [dataPath] path to clock data
	 * @private
	 */
	_onProgressUpdate(ev, dataType, dataPath) {
		const input = ev.currentTarget;
		const segment = input.value;
		const li = $(input).closest('.item');

		if (li.length) {
			// If the clock is from an item
			const itemId = li.data('itemId');
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
	 * Resets the progress clock.
	 * @param {Event} ev - The input change event.
	 * @param {"feature"} [dataType] is the item a feature
	 * @param {string} [dataPath] path to clock data
	 * @private
	 */
	_onProgressReset(ev, dataType, dataPath) {
		const input = ev.currentTarget;
		const li = $(input).closest('.item');

		if (li.length) {
			// If the clock is from an item
			const itemId = li.data('itemId');
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

	/**
	 * Handles clickable rolls based on different roll types.
	 * @param {MouseEvent} event   The originating click event
	 * @private
	 */
	async _onRoll(ev) {
		ev.preventDefault();
		const element = ev.currentTarget;
		const dataset = element.dataset;

		const isShift = ev.shiftKey;
		const isCtrl = ev.ctrlKey;
		// Get the value of optionTargetPriorityRules from game settings
		const settingPriority = game.settings.get('projectfu', 'optionTargetPriorityRules');

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType === 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) {
					if (isCtrl) {
						return new ItemCustomizer(this.actor, item).render(true);
					} else {
						if (settingPriority && this.actor?.type === 'npc') {
							this._targetPriority();
						}
						return item.roll({
							shift: isShift,
							alt: ev.altKey,
							ctrl: ev.ctrlKey,
							meta: ev.metaKey,
						});
					}
				}
			}
			if (dataset.rollType === 'behavior') {
				return this._rollBehavior();
			}

			if (dataset.rollType === 'roll-check') {
				return promptCheck(this.actor);
			}

			if (dataset.rollType === 'roll-init') {
				return ChecksV2.groupCheck(this.actor, GroupCheckV2.initInitiativeCheck);
			}

			if (dataset.rollType === 'open-check') {
				return promptOpenCheck(this.actor, 'FU.OpenCheck', 'open');
			}

			if (dataset.rollType === 'group-check') {
				return ChecksV2.groupCheck(this.actor, isShift ? GroupCheckV2.initInitiativeCheck : GroupCheckV2.initGroupCheck);
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
			const slot = Object.keys(slotMap).find((className) => element.classList.contains(className)) || 'default';
			const itemId = equippedData[slotMap[slot]]; // Use the mapped slot

			const item = this.actor.items.get(itemId);

			// Check if the item exists and call its roll method
			if (item) {
				return item.roll({
					shift: isShift,
					alt: ev.altKey,
					ctrl: ev.ctrlKey,
					meta: ev.metaKey,
				});
			}
		}

		// Handle affinity-type rolls
		if (dataset.rollType === 'affinity-type') {
			const actor = this.actor;
			const affinity = JSON.parse(dataset.action);

			const affinityName = affinity.label;
			const affinityValue = affinity.affTypeCurr;

			// Get the localized string from FU.AffinityDescription
			const description = game.i18n.format('FU.AffinityDescription', {
				affinityName: affinityName,
				affinityValue: affinityValue,
			});

			const params = {
				description: description,
				speaker: ChatMessage.getSpeaker({ actor }),
			};

			createChatMessage(params);
			return;
		}

		// Handle action-type rolls.
		if (dataset.rollType === 'action-type') {
			const actor = this.actor;
			const actionHandlerInstance = new ActionHandler(actor); // Create an instance of ActionHandler

			// Call the handleAction method with the action type and shift key status
			await actionHandlerInstance.handleAction(dataset.action, isShift);
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

	async _updateObject(ev, data) {
		// Foundry's form update handlers send back bond information as an object {0: ..., 1: ....}
		// So correct an update in that form and create an updated bond array to properly represent the changes
		const bonds = data.system?.resources?.bonds;
		if (bonds && !Array.isArray(bonds)) {
			data.system.bonds = Array.from(Object.values(bonds));
		}
		super._updateObject(ev, data);
	}
}
