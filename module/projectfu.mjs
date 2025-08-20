// Import document classes.
import { FUActor } from './documents/actors/actor.mjs';
import { FUItem } from './documents/items/item.mjs';
// Import sheet classes.
import { FUStandardActorSheet } from './sheets/actor-standard-sheet.mjs';
import { FUStandardItemSheet } from './sheets/item-standard-sheet.mjs';
// import { FUActorSheetV2 } from './sheets/actor-sheet-v2.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FU, SYSTEM } from './helpers/config.mjs';
import { registerSystemSettings } from './settings.js';
import { FUCombatTracker } from './ui/combat-tracker.mjs';
import { FUCombat } from './ui/combat.mjs';
import { FUCombatant } from './ui/combatant.mjs';
import { CharacterDataModel } from './documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from './documents/actors/npc/npc-data-model.mjs';
import { AccessoryDataModel } from './documents/items/accessory/accessory-data-model.mjs';
import { ArmorDataModel } from './documents/items/armor/armor-data-model.mjs';
import { BasicItemDataModel } from './documents/items/basic/basic-item-data-model.mjs';
import { BehaviorDataModel } from './documents/items/behavior/behavior-data-model.mjs';
import { ClassDataModel } from './documents/items/class/class-data-model.mjs';
import { ConsumableDataModel } from './documents/items/consumable/consumable-data-model.mjs';
import { HeroicSkillDataModel } from './documents/items/heroic/heroic-skill-data-model.mjs';
import { MiscAbilityDataModel } from './documents/items/misc/misc-ability-data-model.mjs';
import { ProjectDataModel } from './documents/items/project/project-data-model.mjs';
import { RitualDataModel } from './documents/items/ritual/ritual-data-model.mjs';
import { RuleDataModel } from './documents/items/rule/rule-data-model.mjs';
import { ShieldDataModel } from './documents/items/shield/shield-data-model.mjs';
import { SkillDataModel } from './documents/items/skill/skill-data-model.mjs';
import { SpellDataModel } from './documents/items/spell/spell-data-model.mjs';
import { TreasureDataModel } from './documents/items/treasure/treasure-data-model.mjs';
import { WeaponDataModel } from './documents/items/weapon/weapon-data-model.mjs';
import { EffectDataModel } from './documents/items/effect/effect-data-model.mjs';
import { FUSocketHandler } from './socket.mjs';
import { statusEffects } from './documents/effects/statuses.mjs';

import { ClassFeatureTypeDataModel } from './documents/items/classFeature/class-feature-type-data-model.mjs';
import { FUClassFeatureSheet } from './sheets/item-class-feature-sheet.mjs';
import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './documents/items/classFeature/class-feature-data-model.mjs';
import { registerClassFeatures } from './documents/items/classFeature/class-features.mjs';

import { OptionalFeatureTypeDataModel } from './documents/items/optionalFeature/optional-feature-type-data-model.mjs';
import { FUOptionalFeatureSheet } from './sheets/item-optional-feature-sheet.mjs';
import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './documents/items/optionalFeature/optional-feature-data-model.mjs';
import { registerOptionalFeatures } from './documents/items/optionalFeature/optional-features.mjs';

import { rolldataHtmlEnricher } from './helpers/rolldata-html-enricher.mjs';
import { FUActiveEffect } from './documents/effects/active-effect.mjs';
import { InlineDamage } from './helpers/inline-damage.mjs';
import { CanvasDragDrop } from './helpers/canvas-drag-drop.mjs';
import { InlineResources } from './helpers/inline-resources.mjs';
import { InlineChecks } from './helpers/inline-check.mjs';
import { Flags } from './helpers/flags.mjs';
import { InlineIcon } from './helpers/inline-icons.mjs';
import { TextEditorCommandDropdown } from './helpers/text-editor-command-dropdown.mjs';
import { InlineEffects } from './helpers/inline-effects.mjs';
import { SystemControls } from './helpers/system-controls.mjs';
import { PlayerListEnhancements } from './helpers/player-list-enhancements.mjs';
import { Checks } from './checks/checks.mjs';
import { CheckConfiguration } from './checks/check-configuration.mjs';
import { slugify } from './util.mjs';
import { ActionHandler } from './helpers/action-handler.mjs';
import { StudyRollHandler } from './pipelines/study-roll.mjs';
import { ItemCustomizer } from './helpers/item-customizer.mjs';
import { FUHooks } from './hooks.mjs';
import { DamagePipeline } from './pipelines/damage-pipeline.mjs';
import { ResourcePipeline } from './pipelines/resource-pipeline.mjs';
import { InlineWeapon } from './helpers/inline-weapon.mjs';
import { InlineHelper } from './helpers/inline-helper.mjs';
import { Effects } from './pipelines/effects.mjs';
import { InlineType } from './helpers/inline-type.mjs';
import { InvokerIntegration } from './documents/items/classFeature/invoker/invoker-integration.mjs';
import { FUActiveEffectModel } from './documents/effects/active-effect-model.mjs';
import { FUActiveEffectConfig } from './documents/effects/active-effect-config.mjs';
import { InlineClocks } from './helpers/inline-clocks.mjs';
import { PartyDataModel } from './documents/actors/party/party-data-model.mjs';
import { FUPartySheet } from './sheets/actor-party-sheet.mjs';
import { StashDataModel } from './documents/actors/stash/stash-data-model.mjs';
import { FUStashSheet } from './sheets/actor-stash-sheet.mjs';
import { InventoryPipeline } from './pipelines/inventory-pipeline.mjs';
import { registerKeyBindings } from './keybindings.mjs';
import { FUHandlebars } from './helpers/handlebars.mjs';
import { FUEffectItemSheet } from './sheets/item-effect-sheet.mjs';
import { GroupCheck } from './checks/group-check.mjs';
import { CheckPrompt } from './checks/check-prompt.mjs';
import { OpportunityHandler } from './pipelines/opportunity.mjs';
import { FUTokenRuler } from './ui/token-ruler.mjs';

globalThis.projectfu = {
	ClassFeatureDataModel,
	RollableClassFeatureDataModel,
	OptionalFeatureDataModel,
	RollableOptionalFeatureDataModel,
	SYSTEM,
	Flags,
	SystemControls,
	Checks,
	CheckConfiguration,
	ActionHandler,
	StudyRollHandler,
	ItemCustomizer,
	get ChecksV2() {
		console.warn(new Error("You are accessing the deprecated 'globalThis.projectfu.ChecksV2'. Please use 'globalThis.projectfu.Checks' instead."));
		return Checks;
	},
};

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// System Data Model
// Hooks.on("init", () => {
//   CONFIG.Actor.systemDataModels.character = CharacterData;
// });

Hooks.once('init', async () => {
	// Add utility classes to the global game object so that they're more easily
	// accessible in global contexts.
	game.projectfu = {
		FUActor,
		FUItem,
		rollItemMacro,
		ClassFeatureDataModel,
		RollableClassFeatureDataModel,
		OptionalFeatureDataModel,
		RollableOptionalFeatureDataModel,
		Checks: Checks,
		CheckConfiguration,
		ActionHandler,
		ItemCustomizer,
		util: {
			slugify,
		},
		get ChecksV2() {
			console.warn(new Error("You are accessing the deprecated 'game.projectfu.ChecksV2'. Please use 'game.projectfu.Checks' instead."));
			return Checks;
		},
		socket: new FUSocketHandler(),
	};

	// Add custom constants for configuration.
	CONFIG.FU = FU;

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
		formula: '1d@attributes.dex.current + 1d@attributes.ins.current + @derived.init.value',
		decimals: 2,
	};

	// Define custom Document classes
	CONFIG.Actor.documentClass = FUActor;
	CONFIG.Actor.dataModels = {
		character: CharacterDataModel,
		npc: NpcDataModel,
		party: PartyDataModel,
		stash: StashDataModel,
	};
	CONFIG.Actor.trackableAttributes = {
		character: {
			bar: ['resources.hp', 'resources.mp', 'resources.ip'],
			value: ['resources.fp.value', 'resources.exp.value'],
		},
		npc: {
			bar: ['resources.hp', 'resources.mp'],
			value: ['resources.fp.value'],
		},
	};
	CONFIG.Item.documentClass = FUItem;
	CONFIG.Item.dataModels = {
		accessory: AccessoryDataModel,
		armor: ArmorDataModel,
		basic: BasicItemDataModel,
		behavior: BehaviorDataModel,
		class: ClassDataModel,
		classFeature: ClassFeatureTypeDataModel,
		optionalFeature: OptionalFeatureTypeDataModel,
		consumable: ConsumableDataModel,
		heroic: HeroicSkillDataModel,
		miscAbility: MiscAbilityDataModel,
		project: ProjectDataModel,
		ritual: RitualDataModel,
		rule: RuleDataModel,
		shield: ShieldDataModel,
		skill: SkillDataModel,
		spell: SpellDataModel,
		treasure: TreasureDataModel,
		weapon: WeaponDataModel,
		effect: EffectDataModel,
	};
	CONFIG.ActiveEffect.documentClass = FUActiveEffect;
	CONFIG.ActiveEffect.dataModels.base = FUActiveEffectModel;

	// Register system settings
	await registerSystemSettings();
	await registerKeyBindings();

	// Set combat tracker
	console.log(`${SYSTEM} | Initializing combat tracker`);
	CONFIG.Combat.documentClass = FUCombat;
	CONFIG.Combatant.documentClass = FUCombatant;
	CONFIG.Combat.initiative = {
		formula: '1',
		decimals: 0,
	};

	//CONFIG.ui.combat = FUCombatTracker;
	Object.assign(CONFIG.ui, {
		combat: FUCombatTracker,
	});

	// Register status effects
	CONFIG.ActiveEffect.legacyTransferral = false;
	CONFIG.statusEffects = statusEffects;
	CONFIG.specialStatusEffects.DEFEATED = 'ko';

	// Register sheet application classes. The 'types' fields associates the data model for each document.
	foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
	foundry.documents.collections.Actors.registerSheet('projectfu', FUStandardActorSheet, {
		types: ['character', 'npc'],
		makeDefault: true,
		label: 'Standard Actor Sheet v1',
	});
	// foundry.documents.collections.Actors.registerSheet('projectfu', FUActorSheetV2, {
	// 	types: ['character', 'npc'],
	// 	makeDefault: false,
	// 	label: 'Standard Actor Sheet V2',
	// });
	foundry.documents.collections.Actors.registerSheet('projectfu', FUPartySheet, {
		types: ['party'],
		makeDefault: true,
		label: 'Standard Party Sheet',
	});
	foundry.documents.collections.Actors.registerSheet('projectfu', FUStashSheet, {
		types: ['stash'],
		makeDefault: true,
		label: 'Standard Stash Sheet',
	});

	const itemTypesWithSpecialSheets = ['effect', 'classFeature', 'optionalFeature'];
	foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
	foundry.documents.collections.Items.registerSheet('projectfu', FUStandardItemSheet, {
		types: Object.keys(game.system.documentTypes.Item).filter((itemType) => !itemTypesWithSpecialSheets.includes(itemType)),
		makeDefault: true,
		label: 'Standard Item Sheet',
	});
	foundry.documents.collections.Items.registerSheet(SYSTEM, FUClassFeatureSheet, {
		types: ['classFeature'],
		makeDefault: true,
		label: 'Class Feature Sheet',
	});
	foundry.documents.collections.Items.registerSheet(SYSTEM, FUOptionalFeatureSheet, {
		types: ['optionalFeature'],
		makeDefault: true,
		label: 'Optional Feature Sheet',
	});
	foundry.documents.collections.Items.registerSheet(SYSTEM, FUEffectItemSheet, {
		types: ['effect'],
		makeDefault: true,
		label: 'Effect Item Sheet',
	});
	const { DocumentSheetConfig } = foundry.applications.apps;
	DocumentSheetConfig.unregisterSheet(ActiveEffect, 'core', foundry.applications.sheets.ActiveEffectConfig);
	DocumentSheetConfig.registerSheet(ActiveEffect, SYSTEM, FUActiveEffectConfig, {
		makeDefault: true,
	});

	DamagePipeline.initialize();
	ResourcePipeline.initialize();
	Effects.initialize();
	InventoryPipeline.initialize();

	registerClassFeatures(CONFIG.FU.classFeatureRegistry);
	InvokerIntegration.initialize();
	OpportunityHandler.initialize();

	registerOptionalFeatures(CONFIG.FU.optionalFeatureRegistry);

	CONFIG.TextEditor.enrichers.push(rolldataHtmlEnricher);

	// System Text Editor Enrichers
	InlineHelper.registerCommand(InlineDamage);
	InlineHelper.registerCommand(InlineEffects);
	InlineHelper.registerCommand(InlineResources);
	InlineHelper.registerCommand(InlineChecks);
	InlineHelper.registerCommand(InlineWeapon);
	InlineHelper.registerCommand(InlineType);
	InlineHelper.registerCommand(InlineClocks);
	InlineHelper.registerCommand(InlineIcon);

	Hooks.on('dropCanvasData', CanvasDragDrop.onDropCanvasData);

	TextEditorCommandDropdown.initialize();
	SystemControls.initialize();
	PlayerListEnhancements.initialize();

	// // Disable the token drag ruler measurement, unless they've specifically
	// // gone in and enabled it for some reason.
	// if (!game.settings.get(SYSTEM, SETTINGS.optionEnableDragRuler)) {
	// 	CONFIG.Token.rulerClass = null;
	// }

	// Override token ruler class
	CONFIG.Token.rulerClass = FUTokenRuler;

	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('setup', () => {});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

FUHandlebars.registerHelpers();

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

	Hooks.on('rollEquipment', (actor, slot) => {
		// Detect if the shift key is currently pressed
		const isShift = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);

		// Call the rollEquipment function
		rollEquipment(actor, slot, isShift);
	});

	function handleNoActor(actor) {
		if (!actor) {
			ui.notification.error('No character for this user');
			return true;
		}
		return false;
	}

	Hooks.on('promptOpenCheckCalled', (actor) => {
		if (handleNoActor(actor)) return;
		CheckPrompt.openCheck(actor);
	});

	Hooks.on('promptAttributeCheckCalled', (actor) => {
		if (handleNoActor(actor)) return;
		CheckPrompt.attributeCheck(actor);
	});

	Hooks.on('promptGroupCheckCalled', (actor) => {
		if (handleNoActor(actor)) return;
		CheckPrompt.groupCheck(actor);
	});

	Hooks.on('promptInitiativeCheckCalled', (actor) => {
		if (handleNoActor(actor)) return;
		Checks.groupCheck(actor, GroupCheck.initInitiativeCheck);
	});

	Hooks.on(FUHooks.DATA_PREPARED_ACTOR, (actor) => {
		if (!actor.system || !actor.system.immunities) return;

		// Iterate over the actor's active effects
		for (let effect of actor.effects) {
			const statusEffectId = CONFIG.statusEffects.find((e) => effect.statuses?.has(e.id))?.id;

			if (statusEffectId) {
				const immunityData = actor.system.immunities[statusEffectId];

				// If immune, deletes the effect from the actor
				if (immunityData?.base) {
					effect.delete();
				}
			}
		}
	});

	Hooks.on('preUpdateActor', async (actor, updateData, options, userId) => {
		const equipped = foundry.utils.getProperty(updateData, 'system.equipped');

		if (!equipped) return;

		// Check if main hand or off hand is being unequipped
		const mainHandUnequipped = equipped.mainHand === null;
		const offHandUnequipped = equipped.offHand === null;

		// If neither hand is unequipped, exit early
		if (!mainHandUnequipped && !offHandUnequipped) return;

		// Get the Unarmed Strike item
		const unarmedStrike = actor.getSingleItemByFuid('unarmed-strike');
		if (!unarmedStrike) return;

		// Prepare updates only if necessary
		const updates = {};
		if (mainHandUnequipped) updates['system.equipped.mainHand'] = unarmedStrike.id;
		if (offHandUnequipped) updates['system.equipped.offHand'] = unarmedStrike.id;

		// Perform the update if there are changes
		if (Object.keys(updates).length > 0) {
			await actor.update(updates);
		}
	});

	Hooks.on('createItem', (item, options, userId) => {
		if (!item.parent) return; // Make sure the item belongs to an actor or entity
		if (!game.settings.get('projectfu', 'optionAlwaysFavorite')) return;
		if (item.system?.isFavored?.value === true) return; // Already favored
		if (Object.prototype.hasOwnProperty.call(item.system.isFavored, 'value')) {
			item.update({ 'system.isFavored.value': true });
		}
	});
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

// Register the "Doubles" SFX trigger for DiceSoNice
Hooks.once('diceSoNiceReady', (dice3d) => {
	dice3d.addSFXTrigger(
		'doubles',
		'Doubles',
		Array.from({ length: 20 }, (v, i) => (i + 1).toString()),
	);

	Hooks.on('diceSoNiceRollStart', (_messageId, context) => {
		const dice = context.roll.dice;
		if (dice.reduce((agg, curr) => agg + curr.number, 0) === 2) {
			const dieValue = dice[0].results[0].result;
			if (dieValue === (dice[0].results[1] ?? dice[1].results[0]).result) {
				for (const d of dice) {
					d.options.sfx = { id: 'doubles', result: dieValue };
				}
			}
		}
	});
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {null | false}
 */
function createItemMacro(data, slot) {
	// First, determine if this is a valid owned item.
	if (data.type !== 'Item') return;
	if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
		ui.notifications.warn('You can only create macro buttons for owned Items');
		return false;
	}
	// If it is, retrieve it based on the uuid.
	Item.fromDropData(data).then((item) => {
		// Create the macro command using the uuid.
		const command = `game.projectfu.rollItemMacro("${data.uuid}");`;
		let macro = game.macros.find((m) => m.name === item.name && m.command === command);
		if (!macro) {
			Macro.create({
				name: item.name,
				type: 'script',
				img: item.img,
				command: command,
				flags: { 'projectfu.itemMacro': true },
			}).then((macro) => game.user.assignHotbarMacro(macro, slot));
		} else {
			game.user.assignHotbarMacro(macro, slot);
		}
	});
	return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
	// Reconstruct the drop data so that we can load the item.
	const dropData = {
		type: 'Item',
		uuid: itemUuid,
	};
	// Load the item from the uuid.
	Item.fromDropData(dropData).then((item) => {
		// Determine if the item loaded and if it's an owned item.
		if (!item || !item.parent) {
			const itemName = item?.name ?? itemUuid;
			return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
		}

		// Trigger the item roll
		item.roll();
	});
}

/**
 * Rolls equipment for the specified actor and slot.
 * @param {Actor} actor The actor whose equipment will be rolled.
 * @param {string} slot The slot of the equipment to roll ('mainHand', 'offHand', 'armor', or 'accessory').
 * @param {boolean} isShift Indicates whether the shift key is pressed.
 */
function rollEquipment(actor, slot, isShift) {
	// Check if the slot is valid
	const validSlots = ['mainHand', 'offHand', 'armor', 'accessory', 'phantom', 'arcanum'];
	if (!validSlots.includes(slot)) {
		ui.notifications.warn(`Invalid slot: ${slot}!`);
		return;
	}

	// Get the equipped item for the specified slot from actor.system.equipped
	const equippedItemId = actor.system.equipped[slot];

	// If no item is equipped in the specified slot
	if (!equippedItemId) {
		ui.notifications.warn(`No item equipped in ${slot} slot!`);
		return;
	}

	// Find the item in the actor's items by ID
	const item = actor.items.get(equippedItemId);

	// If the item exists, roll it
	if (item) {
		item.roll(isShift);
	} else {
		ui.notifications.warn(`Equipped item in ${slot} slot not found!`);
	}
}
