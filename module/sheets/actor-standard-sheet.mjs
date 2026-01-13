import { Effects, isActiveEffectForStatusEffectId, onManageActiveEffect } from '../pipelines/effects.mjs';
import { ItemCustomizer } from '../helpers/item-customizer.mjs';
import { ActionHandler } from '../helpers/action-handler.mjs';
import { SETTINGS } from '../settings.js';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { Checks } from '../checks/checks.mjs';
import { GroupCheck as GroupCheckV2 } from '../checks/group-check.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { PlayerListEnhancements } from '../helpers/player-list-enhancements.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { systemId, systemTemplatePath } from '../helpers/system-utils.mjs';
import { BehaviorRoll } from '../documents/items/behavior/behavior-roll.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { CheckPrompt } from '../checks/check-prompt.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { CheckHooks } from '../checks/check-hooks.mjs';
import { CommonSections } from '../checks/common-sections.mjs';
import { ClassesTableRenderer } from '../helpers/tables/classes-table-renderer.mjs';
import { SkillsTableRenderer } from '../helpers/tables/skills-table-renderer.mjs';
import { HeroicsTableRenderer } from '../helpers/tables/heroics-table-renderer.mjs';
import { FeatureTables } from '../helpers/tables/feature-tables-renderer.mjs';
import { AbilitiesTableRenderer } from '../helpers/tables/abilities-table-renderer.mjs';
import { ProjectsTableRenderer } from '../helpers/tables/projects-table-renderer.mjs';
import { RulesTableRenderer } from '../helpers/tables/rules-table-renderer.mjs';
import { RitualsTableRenderer } from '../helpers/tables/rituals-table-renderer.mjs';
import { SpellsTableRenderer } from '../helpers/tables/spells-table-renderer.mjs';
import { WeaponsTableRenderer } from '../helpers/tables/weapons-table-renderer.mjs';
import { ShieldsTableRenderer } from '../helpers/tables/shields-table-renderer.mjs';
import { ArmorsTableRenderer } from '../helpers/tables/armors-table-renderer.mjs';
import { AccessoriesTableRenderer } from '../helpers/tables/accessories-table-renderer.mjs';
import { ConsumablesTableRenderer } from '../helpers/tables/consumables-table-renderer.mjs';
import { TreasuresTableRenderer } from '../helpers/tables/treasures-table-renderer.mjs';
import { OtherItemsTableRenderer } from '../helpers/tables/other-items-table-renderer.mjs';
import { BasicAttacksTableRenderer } from '../helpers/tables/basic-attacks-table-renderer.mjs';
import { FavoritesTableRenderer } from '../helpers/tables/favorites-table-renderer.mjs';
import { BehaviorTableRenderer } from '../helpers/tables/behavior-table-renderer.mjs';
import { Flags } from '../helpers/flags.mjs';
import { ActiveEffectsTableRenderer } from '../helpers/tables/active-effects-table-renderer.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { TechnospheresTableRenderer } from '../helpers/tables/technospheres-table-renderer.mjs';

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
			createItem: FUStandardActorSheet.#onCreate,
			createFavorite: FUStandardActorSheet.#onCreateFavorite,
			createClock: FUStandardActorSheet.#onCreateClock,
			updateTrack: { handler: this.#onUpdateTrack, buttons: [0, 2] },
			createClassFeature: FUStandardActorSheet.#onCreateClassFeature,
			editItem: FUStandardActorSheet.#onEdit,
			toggleFavorite: FUStandardActorSheet.#onToggleFavorite,
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
			rest: { buttons: [0, 2], handler: FUStandardActorSheet.handleRestClick },
			levelUp: FUStandardActorSheet.levelUp,

			// Features
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

	// tables required for both player characters and npcs
	#favoritesTable = new FavoritesTableRenderer();
	#skillsTable = new SkillsTableRenderer();
	#abilitiesTable = new AbilitiesTableRenderer();
	#spellsTable = new SpellsTableRenderer();
	#rulesTable = new RulesTableRenderer();
	#treasuresTable = new TreasuresTableRenderer();
	#weaponsTable = new WeaponsTableRenderer();
	#shieldsTable = new ShieldsTableRenderer();
	#armorsTable = new ArmorsTableRenderer();
	#accessoriesTable = new AccessoriesTableRenderer();
	#temporaryEffectsTable = new ActiveEffectsTableRenderer('temporary');
	#passiveEffectsTable = new ActiveEffectsTableRenderer('passive');
	#inactiveEffectsTable = new ActiveEffectsTableRenderer('inactive');

	// tables required for player characters
	#classesTable = new ClassesTableRenderer();
	#heroicsTable = new HeroicsTableRenderer();
	#classFeatureTables = new FeatureTables('classFeature');
	#optionalFeatureTables = new FeatureTables('optionalFeature');
	#projectsTable = new ProjectsTableRenderer();
	#ritualsTable = new RitualsTableRenderer();
	#consumablesTable = new ConsumablesTableRenderer();
	#technospheresTable = new TechnospheresTableRenderer();
	#characterOtherItemsTable = new OtherItemsTableRenderer(
		'class',
		'skill',
		'heroic',
		'classFeature',
		'optionalFeature',
		'miscAbility',
		'project',
		'rule',
		'ritual',
		'spell',
		'weapon',
		'customWeapon',
		'shield',
		'armor',
		'accessory',
		'consumable',
		'treasure',
		'hoplosphere',
		'mnemosphere',
		'mnemosphereReceptacle',
	);

	// tables required for npcs
	#basicAttacksTable = new BasicAttacksTableRenderer();
	#npcOtherItemsTable = new OtherItemsTableRenderer('basic', 'skill', 'spell', 'miscAbility', 'rule', 'treasure', 'behavior');
	#activeBehaviorsTable = new BehaviorTableRenderer(true);
	#inactiveBehaviorsTable = new BehaviorTableRenderer(false);

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
					if (game.settings.get(systemId, SETTINGS.pressureSystem)) {
						context.pressurePoints = true;
						context.weaponCategories = FU.weaponCategories;
					}
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
					context.favoritesTable = await this.#favoritesTable.renderTable(this.document);
				}
				break;

			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				break;

			case 'features':
				context.classFeatureTables = await this.#classFeatureTables.renderTable(this.document);
				context.optionalFeatureTables = await this.#optionalFeatureTables.renderTable(this.document);
				context.abilitiesTable = await this.#abilitiesTable.renderTable(this.document, { hideIfEmpty: true });
				context.projectsTable = await this.#projectsTable.renderTable(this.document);
				context.rulesTable = await this.#rulesTable.renderTable(this.document, { hideIfEmpty: true });
				break;

			case 'classes':
				context.classesTable = await this.#classesTable.renderTable(this.document);
				context.skillsTable = await this.#skillsTable.renderTable(this.document);
				context.heroicsTable = await this.#heroicsTable.renderTable(this.document);
				break;

			case 'spells':
				context.ritualsTable = await this.#ritualsTable.renderTable(this.document);
				context.spellsTable = await this.#spellsTable.renderTable(this.document);
				break;

			case 'combat':
				if (this.actor.system.useEquipment.value) {
					context.weaponsTable = await this.#weaponsTable.renderTable(this.document);
					context.shieldsTable = await this.#shieldsTable.renderTable(this.document);
					context.armorsTable = await this.#armorsTable.renderTable(this.document);
					context.accessoriesTable = await this.#accessoriesTable.renderTable(this.document);
				}
				context.basicAttacksTable = await this.#basicAttacksTable.renderTable(this.document);
				context.skillsTable = await this.#skillsTable.renderTable(this.document, { hideIfEmpty: true });
				context.spellsTable = await this.#spellsTable.renderTable(this.document);
				context.abilitiesTable = await this.#abilitiesTable.renderTable(this.document);
				context.rulesTable = await this.#rulesTable.renderTable(this.document);
				context.treasuresTable = await this.#treasuresTable.renderTable(this.document);
				context.otherItemsTable = await this.#npcOtherItemsTable.renderTable(this.document, { exclude: this.actor.system.useEquipment.value ? ['weapon', 'shield', 'armor', 'accessory'] : [] });
				break;

			case 'behavior':
				context.behaviors = this.actor.getItemsByType('behavior');
				context.activeBehaviorsTable = await this.#activeBehaviorsTable.renderTable(this.document);
				context.inactiveBehaviorsTable = await this.#inactiveBehaviorsTable.renderTable(this.document);
				break;

			case 'items':
				{
					const technosphereMode = game.settings.get(SYSTEM, SETTINGS.technospheres);
					// Set up item data
					context.weaponsTable = await this.#weaponsTable.renderTable(this.document);
					context.shieldsTable = await this.#shieldsTable.renderTable(this.document, { hideIfEmpty: technosphereMode });
					context.armorsTable = await this.#armorsTable.renderTable(this.document);
					context.accessoriesTable = await this.#accessoriesTable.renderTable(this.document);
					context.technospheresTable = await this.#technospheresTable.renderTable(this.document, { hideIfEmpty: !technosphereMode });
					context.consumablesTable = await this.#consumablesTable.renderTable(this.document);
					context.treasuresTable = await this.#treasuresTable.renderTable(this.document);
					context.otherItemsTable = await this.#characterOtherItemsTable.renderTable(this.document);
				}
				break;

			case 'effects':
				context.temporaryEffectsTable = await this.#temporaryEffectsTable.renderTable(this.document);
				context.passiveEffectsTable = await this.#passiveEffectsTable.renderTable(this.document);
				context.inactiveEffectsTable = await this.#inactiveEffectsTable.renderTable(this.document);
				break;

			case 'settings':
				if (this.isNPC) {
					ActorSheetUtils.prepareNpcCompanionData(context);
					if (game.settings.get(systemId, SETTINGS.pressureSystem)) {
						context.pressurePoints = true;
						context.weaponCategories = FU.weaponCategories;
					}
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

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.isNPC = this.isNPC;
		context.isCharacter = this.isCharacter;
		context.FU = FU;

		// Model agnostic
		await ActorSheetUtils.prepareData(context, this);

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

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.#favoritesTable.activateListeners(this);
		this.#classesTable.activateListeners(this);
		this.#skillsTable.activateListeners(this);
		this.#heroicsTable.activateListeners(this);
		this.#classFeatureTables.activateListeners(this);
		this.#optionalFeatureTables.activateListeners(this);
		this.#abilitiesTable.activateListeners(this);
		this.#projectsTable.activateListeners(this);
		this.#rulesTable.activateListeners(this);
		this.#ritualsTable.activateListeners(this);
		this.#spellsTable.activateListeners(this);
		this.#weaponsTable.activateListeners(this);
		this.#shieldsTable.activateListeners(this);
		this.#armorsTable.activateListeners(this);
		this.#accessoriesTable.activateListeners(this);
		this.#consumablesTable.activateListeners(this);
		this.#treasuresTable.activateListeners(this);
		this.#characterOtherItemsTable.activateListeners(this);
		this.#technospheresTable.activateListeners(this);
		this.#basicAttacksTable.activateListeners(this);
		this.#npcOtherItemsTable.activateListeners(this);
		this.#activeBehaviorsTable.activateListeners(this);
		this.#inactiveBehaviorsTable.activateListeners(this);
		this.#temporaryEffectsTable.activateListeners(this);
		this.#passiveEffectsTable.activateListeners(this);
		this.#inactiveEffectsTable.activateListeners(this);
	}

	async _onDropItem(event, item) {
		if (item.system.onActorDrop instanceof Function) {
			if (item.system.onActorDrop(this.actor) === false) {
				return;
			}
		}

		const subtype = item.system.subtype?.value;
		// Determine the configuration based on item type
		const config = ActorSheetUtils.findItemConfig(item.type, subtype);
		if (config) {
			// Check if there is an active ProseMirror editor
			const activeEditor = document.querySelector('.editor-content.ProseMirror');
			if (item.type === 'effect') {
				if (activeEditor) {
					// Handle effect drop into ProseMirror editor
					return await this._handleEditorEffectDrop(item, event);
				} else {
					// Handle effect drop into actor sheet
					return await this._importEffectData(item);
				}
			} else {
				// Handle other item drops
				const existingItem = this.actor.items.find((i) => i.name === item.name && i.type === item.type);
				if (existingItem) {
					return await config.update(item, existingItem);
				}
			}
		}

		return super._onDropItem(event, item);
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
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'header': {
				const img = element.querySelector('.profile-img');
				if (img) {
					img.addEventListener('contextmenu', (event) => {
						event.preventDefault();
						const src = event.currentTarget.getAttribute('src');
						if (src) {
							// eslint-disable-next-line no-undef
							const popout = new ImagePopout(src, {
								title: this.actor.name,
								uuid: this.actor.uuid,
							});
							popout.render(true);
						}
					});
				}
			}
		}
	}

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

	async _onDragStart(ev) {
		const target = ev.currentTarget;

		// Owned Items
		if (target.dataset.itemId) {
			let item = this.actor.items.get(target.dataset.itemId);
			if (!item) {
				item = fromUuidSync(target.dataset.uuid);
			}
			ev.dataTransfer.setData('text/plain', JSON.stringify(item.toDragData()));
			return;
		}

		// Active Effect
		if (target.dataset.effectId) {
			let effect = this.actor.effects.get(target.dataset.effectId);
			if (!effect) {
				effect = fromUuidSync(target.dataset.uuid);
			}
			ev.dataTransfer.setData('text/plain', JSON.stringify(effect.toDragData()));
			return;
		}

		return super._onDragStart(ev);
	}

	/* -------------------------------------------- */

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

	/////////////////////
	// ACTION HANDLERS //
	/////////////////////

	static #onEdit(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(itemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}

		if (item) {
			item.sheet.render(true);
		}
	}

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
		if (dataset.rollType === 'item' || target.closest('[data-item-id]')) {
			const itemId = target.closest('[data-item-id]').dataset.itemId;
			let item = this.actor.items.get(itemId);
			if (!item && target.closest('.item').dataset.uuid) {
				item = await fromUuid(target.closest('.item').dataset.uuid);
			}
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

		await item.toggleFavorite();
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
		const crisisHP = this.actor.system.resources.hp.crisisScore;

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
	static ClearTempEffects(event, target) {
		event.preventDefault();
		const actor = this.actor;
		if (!actor || !actor.system || !actor.system.immunities) {
			return;
		}
		actor.clearTemporaryEffects();
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onUpdateTrack(event, target) {
		const { updateAmount, id, dataPath, alternate } = target.dataset;
		let increment = parseInt(updateAmount);
		if (alternate && event.button === 2) {
			increment = -increment;
		}

		let document;
		document = this.actor.getEffect(id);
		if (!document) {
			document = this.actor.getItemById(id);
		}

		if (document) {
			return ProgressDataModel.updateForDocument(document, dataPath, increment);
		}
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
	static #onToggleFavorite(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item;
		if (!itemId) {
			item = this.actor.items.get(itemId);
		}

		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			if (uuid) {
				item = fromUuidSync(uuid);
			}
		}

		if (item) {
			return item.toggleFavorite();
		}
	}

	static async #onCreate(event, target) {
		let type = target.dataset.type;
		let subType = target.dataset.subType;

		if (type && type.indexOf(',') >= 0) {
			const knownItemTypes = new Set(Object.keys(CONFIG.Item.dataModels));
			const choices = type
				.split(',')
				.map((itemType) => itemType.trim())
				.filter((itemType) => knownItemTypes.has(itemType))
				.map((itemType) => ({
					action: itemType,
					label: game.i18n.localize(CONFIG.Item.typeLabels[itemType]),
				}));

			type = await foundry.applications.api.DialogV2.wait({
				window: { title: 'Select Item Type' },
				content: `<p>Select the type of item you want to create:</p>`,
				buttons: choices,
			});
		}

		if (!type) {
			return;
		}

		const itemData = {
			type: type,
		};

		if (type === 'classFeature') {
			itemData.system = { featureType: subType };
			itemData.name = this.#determineNewFeatureName(type, subType, this.actor);
		} else if (type === 'optionalFeature') {
			itemData.system = { optionalType: subType };
			itemData.name = this.#determineNewFeatureName(type, subType, this.actor);
		} else {
			itemData.name = foundry.documents.Item.defaultName({ type: type, parent: this.actor });
		}

		foundry.documents.Item.create(itemData, { parent: this.actor });
	}

	#determineNewFeatureName(type, subtype, actor) {
		const registry = {
			classFeature: FU.classFeatureRegistry,
			optionalFeature: FU.optionalFeatureRegistry,
		}[type];

		const FeatureDataModel = registry.byKey(subtype);

		if (!FeatureDataModel) {
			return null;
		}

		const takenNames = new Set();
		for (const document of actor.itemTypes[type]) {
			takenNames.add(document.name);
		}

		const baseName = game.i18n.localize(FeatureDataModel.translation);
		let name = baseName;
		let index = 1;
		while (takenNames.has(name)) name = `${baseName} (${++index})`;
		return name;
	}

	static async #onCreateFavorite() {
		// Get all available item types and class feature types
		const allItemTypes = Object.keys(CONFIG.Item.dataModels);
		const isCharacter = this.actor.type === 'character';
		const isNPC = this.actor.type === 'npc';
		const optionalFeatureTypes = Object.entries(CONFIG.FU.optionalFeatureRegistry.qualifiedTypes);
		let types = allItemTypes.map((type) => ({ type, label: game.i18n.localize(CONFIG.Item.typeLabels[type]) }));

		if (isCharacter) {
			// Filter out item type
			const dontShowCharacter = ['rule', 'behavior', 'basic', 'effect']; // Default types to hide for characters
			// Filter out default types to hide for characters
			types = types.filter((item) => !dontShowCharacter.includes(item.type));

			// Optional Features
			let optionalFeatures = optionalFeatureTypes.map(([key, optional]) => ({
				type: 'optionalFeature',
				subtype: key,
				label: game.i18n.localize(optional.translation),
			}));

			// Push filtered optional features to types array
			types.push(...optionalFeatures);
		} else if (isNPC) {
			const dontShowNPC = ['class', 'classFeature', 'optionalFeature', 'skill', 'heroic', 'project', 'ritual', 'consumable', 'effect']; // Default types to hide for NPCs
			if (!game.settings.get(SYSTEM, SETTINGS.optionBehaviorRoll)) dontShowNPC.push('behavior');
			// Filter out default types to hide for NPCs
			types = types.filter((item) => !dontShowNPC.includes(item.type));
		}

		const buttons = types
			.map((item) => ({
				action: `${item.type}${item.subtype ? `:${item.subtype}` : ''}`,
				label: item.label,
				callback: () => item,
			}))
			.sort((a, b) => a.label.localeCompare(b.label));

		const choice = await foundry.applications.api.DialogV2.wait({
			window: { title: 'Select Item Type', contentClasses: ['dialog-buttons-grid'] },
			position: { width: 400 },
			content: `<p>Select the type of item you want to create:</p>`,
			buttons: buttons,
		});

		if (choice) {
			const itemData = {
				type: choice.type,
				flags: { [SYSTEM]: { [Flags.Favorite]: true } },
			};
			if (choice.type === 'classFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				(itemData.system ??= {}).featureType = choice.subtype;
			} else if (choice.type === 'optionalFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				(itemData.system ??= {}).optionalType = choice.subtype;
			} else {
				itemData.name = foundry.documents.Item.defaultName({ type: choice.type, parent: this.actor });
			}
			foundry.documents.Item.create(itemData, { parent: this.actor });
		}
	}

	static async #onCreateClock() {
		let types = [];

		// Get all available item types and class feature types
		const isCharacter = this.actor.type === 'character';
		const isNPC = this.actor.type === 'npc';

		if (isCharacter) {
			types = ['miscAbility', 'ritual'].map((type) => ({
				type: type,
				label: game.i18n.localize(CONFIG.Item.typeLabels[type]),
			}));
			// Check if the optionZeroPower setting is false, then add the zeroPower feature
			if (FU.optionalFeatures.zeroPower) {
				types.push({
					type: 'optionalFeature',
					subtype: FU.optionalFeatures.zeroPower,
					label: game.i18n.localize('FU.Limit'),
				});
			}
		} else if (isNPC) {
			types = ['miscAbility', 'rule'].map((type) => ({
				type: type,
				label: game.i18n.localize(CONFIG.Item.typeLabels[type]),
			}));
		}

		const buttons = types
			.map((item) => {
				return {
					action: `${item.type}${item.subtype ? `:${item.subtype}` : ''}`,
					label: item.label,
					callback: () => item,
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label));

		const choice = await foundry.applications.api.DialogV2.wait({
			window: { title: 'Select Item Type', contentClasses: ['dialog-buttons-grid'] },
			position: { width: 400 },
			content: `<p>Select the type of item you want to create:</p>`,
			buttons: buttons,
		});

		if (choice) {
			const itemData = {
				type: choice.type,
				flags: { [SYSTEM]: { [Flags.Favorite]: true } },
				system: { hasClock: { value: true } },
			};
			if (choice.type === 'classFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				itemData.system.featureType = choice.subtype;
			} else if (choice.type === 'optionalFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				itemData.system.optionalType = choice.subtype;
			} else {
				itemData.name = foundry.documents.Item.defaultName({ type: choice.type, parent: this.actor });
			}
			foundry.documents.Item.create(itemData, { parent: this.actor });
		}
	}

	static async #onCreateClassFeature() {
		let types = ['miscAbility', 'project'];
		// Filter out item type
		types = types.map((type) => ({ type, label: game.i18n.localize(CONFIG.Item.typeLabels[type]) }));
		// Class Features
		types.push(
			...Object.entries(CONFIG.FU.classFeatureRegistry.qualifiedTypes).map(([key, feature]) => ({
				type: 'classFeature',
				subtype: key,
				label: game.i18n.localize(feature.translation),
			})),
		);

		// Push filtered types to the types array
		types.push(
			...Object.entries(CONFIG.FU.optionalFeatureRegistry.qualifiedTypes).map(([key, optional]) => ({
				type: 'optionalFeature',
				subtype: key,
				label: game.i18n.localize(optional.translation),
			})),
		);

		const buttons = types
			.map((item) => {
				return {
					action: `${item.type}${item.subtype ? `:${item.subtype}` : ''}`,
					label: item.label,
					callback: () => item,
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label));

		const choice = await foundry.applications.api.DialogV2.wait({
			window: { title: 'Select Item Type', contentClasses: ['dialog-buttons-grid'] },
			position: { width: 400 },
			rejectClose: false,
			content: `<p>Select the type of item you want to create:</p>`,
			buttons: buttons,
		});

		if (choice) {
			const itemData = {
				type: choice.type,
			};
			if (choice.type === 'classFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				itemData.system = { featureType: choice.subtype };
			} else if (choice.type === 'optionalFeature') {
				itemData.name = this.#determineNewFeatureName(choice.type, choice.subtype, this.actor);
				itemData.system = { optionalType: choice.subtype };
			} else {
				itemData.name = foundry.documents.Item.defaultName({ type: choice.type, parent: this.actor });
			}
			foundry.documents.Item.create(itemData, { parent: this.actor });
		}
	}
}
