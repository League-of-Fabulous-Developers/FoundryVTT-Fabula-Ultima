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
import { FUActorSheet } from './actor-sheet.mjs';

const TOGGLEABLE_STATUS_EFFECT_IDS = ['crisis', 'slow', 'dazed', 'enraged', 'dex-up', 'mig-up', 'ins-up', 'wlp-up', 'guard', 'weak', 'shaken', 'poisoned', 'dex-down', 'mig-down', 'ins-down', 'wlp-down'];

/**
 * @description Standard actor sheet, now v2
 * @extends {FUActorSheet}
 */
export class FUStandardActorSheet extends FUActorSheet {
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
			guardAction: FUStandardActorSheet.PerformAction,
			hinderAction: FUStandardActorSheet.PerformAction,
			objectiveAction: FUStandardActorSheet.PerformAction,
			skillAction: FUStandardActorSheet.PerformAction,
			toggleStatusEffect: FUStandardActorSheet.ToggleStatusEffect,
			useEquipment: FUStandardActorSheet.ToggleUseEquipment,
			itemFavored: FUStandardActorSheet.ToggleItemFavored,
			zenitTransfer: FUStandardActorSheet.ZenitTransfer,
			crisisHP: FUStandardActorSheet.CrisisHP,
			addBond: FUStandardActorSheet.AddBond,
			deleteBond: FUStandardActorSheet.DeleteBond,
			updateClock: FUStandardActorSheet.UpdateClock,
		},
	};

	// TODO: Actually break these into proper parts
	// These will be filtered in _configureRenderOptions
	static PARTS = {
		// character: { template: `systems/projectfu/templates/actor/actor-character-sheet.hbs` },
		header: { template: `systems/projectfu/templates/actor/partials/actor-header.hbs` },
		resources: { template: `systems/projectfu/templates/actor/partials/actor-resources.hbs` },
		affinities: { template: `systems/projectfu/templates/actor/partials/actor-affinities.hbs` },
		tabs: { template: `systems/projectfu/templates/actor/partials/actor-tabs.hbs` },
		attributes: { template: `systems/projectfu/templates/actor/sections/actor-section-attributes.hbs` },
		combat: { template: `systems/projectfu/templates/actor/sections/actor-section-combat.hbs` },
		spells: { template: `systems/projectfu/templates/actor/sections/actor-section-spells.hbs` },
		notes: { template: `systems/projectfu/templates/actor/sections/actor-section-notes.hbs` },
		behavior: { template: `systems/projectfu/templates/actor/sections/actor-section-behavior.hbs` },
		// npc: { template: `systems/projectfu/templates/actor/actor-npc-sheet.hbs` },
		'character-limited': { template: `systems/projectfu/templates/actor/actor-character-limited-sheet.hbs` },
		'npc-limited': { template: `systems/projectfu/templates/actor/actor-npc-limited-sheet.hbs` },

		effects: { template: `systems/projectfu/templates/actor/sections/actor-section-effects.hbs` },
		settings: { template: `systems/projectfu/templates/actor/sections/actor-section-settings.hbs` },
	};

	/**
	 * These arrays are used in _configureRenderOptions later to filter out template parts
	 * used for the actual type of actor (character, npc, limited character, limited npc)
	 * being displayed
	 */

	// Parts actually used for a character type actor
	static CHARACTER_PARTS = ['character'];
	// Parts used for NPC type actor
	static NPC_PARTS = ['header', 'resources', 'affinities', 'tabs', 'attributes', 'combat', 'notes', 'behavior', 'effects', 'settings'];
	// Parts used for limited view of a character type actor
	static CHARACTER_LIMITED_PARTS = ['character-limited'];
	// Parts used for limited view of an NPC type actor
	static NPC_LIMITED_PARTS = ['npc-limited'];

	static TABS = {
		character: {
			stats: {},
			classes: {},
			features: {},
			spells: {},
			items: {},
			notes: {},
			effects: {},
			settings: {},
		},
		npc: {
			attributes: {
				label: 'FU.Stats',
				group: 'primary',
				cssClass: '',
				active: true,
			},
			combat: {
				label: 'FU.Combat',
				group: 'primary',
				cssClass: '',
			},
			behavior: {
				label: 'FU.Behavior',
				group: 'primary',
				cssClass: '',
			},
			notes: {
				tooltip: 'FU.BiographyInfo',
				icon: 'fa-solid fa-file-pen',
				group: 'primary',
				cssClass: '',
			},
			effects: {
				tooltip: 'FU.Effects',
				icon: 'fa-solid fa-wand-magic-sparkles',
				group: 'primary',
				cssClass: '',
			},
			settings: {
				tooltip: 'FU.Settings',
				icon: 'fa-solid fa-sliders',
				group: 'primary',
				cssClass: '',
			},
		},
		// Limited sheets don't actually have any tabs currently, but are included here to make adding them in the future a little more convenient.
		'character-limited': {},
		'npc-limited': {},
	};

	constructor(...args) {
		super(...args);

		// Initialize sortOrder
		this.sortOrder = 1;
	}

	/* -------------------------------------------- */

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);

		// Select just which parts to display for the sheet, based on actor type and visibility
		const wl = ['character', 'npc'];
		if (!game.user.isGM && !this.actor.testUserPermission(game.user, 'OBSERVER') && wl.includes(this.actor.type)) {
			options.parts = [...FUStandardActorSheet[`${this.actor.type.toUpperCase()}_LIMITED_PARTS`]];
		} else {
			options.parts = [...FUStandardActorSheet[`${this.actor.type.toUpperCase()}_PARTS`]];
		}
	}

	_prepareTabs() {
		// Deep clone so we don't affect the original reference
		const tabs = {};
		foundry.utils.mergeObject(tabs, FUStandardActorSheet.TABS[this.actor.type]);

		// Remove some optional tabs, maybe
		if (this.actor.type === 'npc') {
			// Behavior roll
			if (!game.settings.get('projectfu', 'optionBehaviorRoll')) delete tabs.behavior;
			// NPC notes
			if (!game.settings.get('projectfu', 'optionNPCNotesTab')) delete tabs.notes;
		}

		// Make sure the tab includes its id and active or not
		Object.entries(tabs).forEach(([id, tab], i) => {
			tab.id = id;
			tab.active = this.tabGroups.primary === id || (!this.tabGroups.primary && i === 0);
		});

		return tabs;
	}

	async _preparePartContext(partId, ctx) {
		const context = await super._preparePartContext(partId, ctx);
		if (Array.isArray(context.tabs)) context.tab = context.tabs.find((tab) => tab.id === partId);
		else context.tab = context.tabs[partId];

		return context;
	}

	/** @override */
	async _prepareContext(options) {
		// Retrieve the data structure from the base sheet. You can inspect or log
		// the context variable to see the structure, but some key properties for
		// sheets are the actor object, the data object, whether or not it's
		// editable, the items array, and the effects array.
		const context = await super._prepareContext(options);
		context.tabs = this._prepareTabs();

		// this.prepareTabs(context);
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

		context.items = context.items.contents.sort(sortFn);
		// context.items is an EmbeddedCollection, rather than the array directly.
		// context.items.sort(sortFn);

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
			description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.system.description ?? '', {
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

		context.showMetaCurrency = this.actor.type === 'character' || this.actor.system.villain.value;

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
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
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
	/**
	 * @param {HTMLElement} html
	 */
	// activateListeners(html) {
	_onRender(context, options) {
		const html = this.element;
		super._onRender(context, options);
		// super.activateListeners(html);
		// html = html[0];
		ActorSheetUtils.activateDefaultListeners(html, this);

		html.addEventListener('mouseup', (ev) => {
			if (ev.target.closest('.effect') && ev.button === 1) {
				// Check for middle-click (button 1)
				this._onMiddleClickEditEffect(ev);
			}
		});

		html.addEventListener('click', async (ev) => {
			// Send active effect to chat
			if (ev.target.closest('.effect-roll')) {
				onManageActiveEffect(ev, this.actor);
			}

			// Active Effect management
			if (ev.target.closest('.effect-control')) {
				onManageActiveEffect(ev, this.actor);
			}
		});

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Create an instance of EquipmentHandler
		const eh = new EquipmentHandler(this.actor);

		// Editable item actions
		ActorSheetUtils.activateInventoryListeners(html, this);
		// html.addEventListener('click', (ev) => {
		// 	const target = ev.target;

		// 	if (target.closest('.use-equipment')) {
		// 		this._onUseEquipment(ev);
		// 	} else if (target.closest('.item-favored')) {
		// 		this._onItemFavorite(ev);
		// 	} else if (target.closest('.zenit-deposit')) {
		// 		InventoryPipeline.promptPartyZenitTransfer(this.actor, 'deposit');
		// 	} else if (target.closest('.zenit-withdraw')) {
		// 		InventoryPipeline.promptPartyZenitTransfer(this.actor, 'withdraw');
		// 	} else if (target.closest('.increment-button')) {
		// 		this._onIncrementButtonClick(ev);
		// 	} else if (target.closest('.decrement-button')) {
		// 		this._onDecrementButtonClick(ev);
		// 	} else if (target.closest('.is-levelup')) {
		// 		this._onLevelUp(ev);
		// 	} else if (target.closest('.skillLevel input')) {
		// 		this._onSkillLevelUpdate(ev);
		// 	} else if (target.closest('.progress input')) {
		// 		const progress = target.closest('.progress');
		// 		const dataType = progress?.dataset.type;
		// 		const dataPath = progress?.dataset.dataPath;
		// 		this._onProgressUpdate(ev, dataType, dataPath);
		// 	} else if (target.closest('.item-equip')) {
		// 		eh.handleItemClick(ev, 'left');
		// 	}
		// });

		html.addEventListener('contextmenu', (ev) => {
			const target = ev.target;

			if (target.closest('.increment-button')) {
				this._onIncrementButtonClick(ev);
			} else if (target.closest('.decrement-button')) {
				this._onDecrementButtonClick(ev);
			} else if (target.closest('.skillLevel')) {
				this._onSkillLevelReset(ev);
			} else if (target.closest('.progress input')) {
				const progress = target.closest('.progress');
				const dataType = progress?.dataset.type;
				const dataPath = progress?.dataset.dataPath;
				this._onProgressReset(ev, dataType, dataPath);
			} else if (target.closest('.item-equip')) {
				eh.handleItemClick(ev, 'right');
			}
		});

		html.addEventListener('mousedown', (ev) => {
			if (ev.ctrlKey && ev.button === 0) {
				// Left mouse button with Ctrl
				eh.handleItemClick(ev, 'ctrl');
				ev.preventDefault();
			}
		});

		// Rest handling (click and contextmenu)
		// Note:  This one is NOT pulled to an action because that does not handle right clicking
		html.querySelectorAll('.rest').forEach((el) => {
			el.addEventListener('click', this.handleRestClick.bind(this));
			el.addEventListener('contextmenu', this.handleRestClick.bind(this));
		});

		const sortButton = html.querySelector('#sortButton');

		if (sortButton) {
			sortButton.addEventListener('mousedown', (ev) => {
				if (ev.button === 2) {
					// Right-click: change sort type
					this.changeSortType();
				} else {
					// Left-click: toggle ascending/descending
					this.sortOrder *= -1;
					this.render();
				}
			});
		}

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

		// Toggle embarked state
		html.querySelectorAll('.vehicle-section [data-action="toggleVehicleEmbarked"]').forEach((el) => {
			el.addEventListener('click', updatePilotVehicle('updateEmbarked').bind(this));
		});

		// Toggle active vehicle
		html.querySelectorAll('[data-action="toggleActiveVehicle"][data-item-id]').forEach((el) => {
			el.addEventListener('click', updatePilotVehicle('updateActiveVehicle').bind(this));
		});

		// Toggle armor module
		html.querySelectorAll('[data-action="toggleArmorModule"][data-item-id]').forEach((el) => {
			el.addEventListener('click', updatePilotVehicle('updateActiveArmorModule').bind(this));
		});

		// Toggle weapon module
		html.querySelectorAll('[data-action="toggleWeaponModule"][data-item-id]').forEach((el) => {
			el.addEventListener('click', updatePilotVehicle('updateActiveWeaponModules').bind(this));
		});

		// Toggle support module
		html.querySelectorAll('[data-action="toggleSupportModule"][data-item-id]').forEach((el) => {
			el.addEventListener('click', updatePilotVehicle('updateActiveSupportModules').bind(this));
		});

		const updateArcanistArcanum = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const currentArcanumId = this.actor.system.equipped.arcanum;

			// Toggle arcanum slot
			const newArcanumId = currentArcanumId === itemId ? null : itemId;

			this.actor.update({
				'system.equipped.arcanum': newArcanumId,
			});
		};

		html.querySelectorAll('[data-action="toggleActiveArcanum"][data-item-id]').forEach((el) => {
			el.addEventListener('click', updateArcanistArcanum.bind(this));
		});

		const toggleActiveGarden = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const item = this.actor.items.get(itemId);

			return this.actor.system.floralist.toggleActiveGarden(item);
		};

		html.querySelectorAll('[data-action="toggleActiveGarden"][data-item-id]').forEach((el) => {
			el.addEventListener('click', toggleActiveGarden.bind(this));
		});

		const togglePlantedMagiseed = (ev) => {
			const itemId = ev.currentTarget.dataset.itemId;
			const item = this.actor.items.get(itemId);

			return this.actor.system.floralist.togglePlantedMagiseed(item);
		};

		html.querySelectorAll('[data-action="togglePlantedMagiseed"][data-item-id]').forEach((el) => {
			el.addEventListener('click', togglePlantedMagiseed.bind(this));
		});

		// Clear temporary effects
		html.querySelectorAll('span[data-action="clearTempEffects"]').forEach((el) => {
			el.addEventListener('click', this._onClearTempEffects.bind(this));
		});

		// Dropzone event listeners
		const dropZone = html.querySelector('.desc.drop-zone');
		if (dropZone) {
			dropZone.addEventListener('dragenter', this._onDragEnter.bind(this));
			dropZone.addEventListener('dragleave', this._onDragLeave.bind(this));
			dropZone.addEventListener('drop', this._onDropReset.bind(this));
		}
	}

	// Handle adding item to favorite
	async _onItemFavorite(ev) {
		const itemEl = ev.target.closest('.item');
		if (!itemEl) return;

		const itemId = itemEl.dataset.itemId;
		const item = this.actor.items.get(itemId);
		if (!item) return;

		const isFavoredBool = item.system.isFavored?.value ?? false;

		await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.isFavored.value': !isFavoredBool }]);
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
		console.log('Skill level update;', ev);
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
	 * @param {Event | PointerEvent} ev - The button click event.
	 * @private
	 */
	_onIncrementButtonClick(ev) {
		ev.preventDefault();

		const dataType = ev.currentTarget.dataset.type ?? ev.srcElement.closest(`[data-type]`).dataset.type;
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
		const element = ev.srcElement.closest('.rollable');
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
			// const affinity = JSON.parse(dataset.action);
			const affinity = JSON.parse(dataset.affinity);

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

		// // Handle action-type rolls.
		// if (dataset.rollType === 'action-type') {
		// 	const actor = this.actor;
		// 	const actionHandlerInstance = new ActionHandler(actor); // Create an instance of ActionHandler

		// 	// Call the handleAction method with the action type and shift key status
		// 	await actionHandlerInstance.handleAction(dataset.action, isShift);
		// }

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

	/** Action handlers  */

	static Roll(e, elem) {
		this._onRoll(e);
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
		await actionHandler.handleAction(elem.dataset.action, isShift);
	}

	static ToggleStatusEffect(e, elem) {
		Effects.toggleStatusEffect(this.actor, elem.dataset.statusId, InlineSourceInfo.fromInstance(this.actor));
	}

	static ToggleUseEquipment(e, elem) {
		this._onUseEquipment(e);
	}

	static ToggleItemFavored(e, elem) {
		this._onItemFavorite(e);
	}

	static ZenitTransfer(e, elem) {
		InventoryPipeline.promptPartyZenitTransfer(this.actor, elem.dataset.zenitAction);
	}

	static async CrisisHP(e, elem) {
		const maxHP = this.actor.system.resources.hp.max;
		const crisisHP = Math.floor(maxHP / 2);
		const updateData = {
			'system.resources.hp.value': crisisHP,
		};
		await this.actor.update(updateData);
		this.actor.sheet.render(true);
	}

	static async AddBond(e, elem) {
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

	static async DeleteBond(e, elem) {
		const bondIndex = Number(e.currentTarget.dataset.bondIndex);
		const newBonds = [...this.actor.system.bonds];
		newBonds.splice(bondIndex, 1);
		await this.actor.update({ 'system.bonds': newBonds });
	}

	static async UpdateClock(e, elem) {
		const rightClick = e.which === 3 || e.button === 2;
		const { itemId, updateAmount, dataPath } = elem.dataset;

		const clock = this.actor.items.get(itemId);
		await this._updateClockProgress(clock, parseFloat(updateAmount), rightClick, dataPath);
	}
}
