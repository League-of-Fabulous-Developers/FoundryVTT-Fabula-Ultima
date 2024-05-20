// Import document classes.
import { FUActor } from './documents/actors/actor.mjs';
import { FUItem } from './documents/items/item.mjs';
// Import sheet classes.
import { FUStandardActorSheet } from './sheets/actor-standard-sheet.mjs';
import { FUItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FU, SYSTEM } from './helpers/config.mjs';
import { registerSystemSettings, SETTINGS } from './settings.js';
import { addRollContextMenuEntries, createCheckMessage, promptCheck, rollCheck } from './helpers/checks.mjs';
import { FUCombatTracker } from './ui/combat-tracker.mjs';
import { FUCombat } from './ui/combat.mjs';
import { FUCombatant } from './ui/combatant.mjs';
import { GroupCheck } from './helpers/group-check.mjs';
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
import { ZeroPowerDataModel } from './documents/items/zeropower/zero-power-data-model.mjs';
import { WeaponDataModel } from './documents/items/weapon/weapon-data-model.mjs';
import { onSocketLibReady } from './socket.mjs';
import { statusEffects } from './helpers/statuses.mjs';

import { ClassFeatureTypeDataModel } from './documents/items/classFeature/class-feature-type-data-model.mjs';
import { FUClassFeatureSheet } from './documents/items/classFeature/class-feature-sheet.mjs';
import { ClassFeatureDataModel, RollableClassFeatureDataModel } from './documents/items/classFeature/class-feature-data-model.mjs';
import { registerClassFeatures } from './documents/items/classFeature/class-features.mjs';

import { OptionalFeatureTypeDataModel } from './documents/items/optionalFeature/optional-feature-type-data-model.mjs';
import { FUOptionalFeatureSheet } from './documents/items/optionalFeature/optional-feature-sheet.mjs';
import { OptionalFeatureDataModel, RollableOptionalFeatureDataModel } from './documents/items/optionalFeature/optional-feature-data-model.mjs';
import { registerOptionalFeatures } from './documents/items/optionalFeature/optional-features.mjs';

import { rolldataHtmlEnricher } from './helpers/rolldata-html-enricher.mjs';
import { FUActiveEffect, onApplyActiveEffect, onRenderActiveEffectConfig } from './documents/effects/active-effect.mjs';
import { registerChatInteraction } from './helpers/apply-damage.mjs';
import { InlineDamage } from './helpers/inline-damage.mjs';
import { CanvasDragDrop } from './helpers/canvas-drag-drop.mjs';
import { InlineResources } from './helpers/inline-resources.mjs';
import { Flags } from './helpers/flags.mjs';
import { InlineElementsHowTo } from './helpers/inline-how-to.mjs';
import { InlineIcon } from './helpers/inline-icons.mjs';
import { TextEditorCommandDropdown } from './helpers/text-editor-command-dropdown.mjs';
import { InlineEffects } from './helpers/inline-effects.mjs';
import { SystemControls } from './helpers/system-controls.mjs';
import { PlayerListEnhancements } from './helpers/player-list-enhancements.mjs';

globalThis.projectfu = {
	ClassFeatureDataModel,
	RollableClassFeatureDataModel,
	OptionalFeatureDataModel,
	RollableOptionalFeatureDataModel,
	SYSTEM,
	Flags,
	SystemControls,
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
		rollCheck,
		createCheckMessage,
		GroupCheck: GroupCheck,
		ClassFeatureDataModel,
		RollableClassFeatureDataModel,
		OptionalFeatureDataModel,
		RollableOptionalFeatureDataModel,
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
	};
	CONFIG.Actor.trackableAttributes = {
		character: {
			bar: ['resources.hp', 'resources.mp', 'resources.ip'],
			value: ['resources.fp.value'],
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
		zeroPower: ZeroPowerDataModel,
	};
	CONFIG.ActiveEffect.documentClass = FUActiveEffect;
	Hooks.on('renderActiveEffectConfig', onRenderActiveEffectConfig);
	Hooks.on('applyActiveEffect', onApplyActiveEffect);

	// Register system settings
	registerSystemSettings();

	if (game.settings.get(SYSTEM, SETTINGS.experimentalCombatTracker)) {
		console.log(`${SYSTEM} | Initializing experimental combat tracker`);
		CONFIG.Combat.documentClass = FUCombat;
		CONFIG.Combatant.documentClass = FUCombatant;
		CONFIG.Combat.initiative = {
			formula: '1',
			decimals: 0,
		};
		CONFIG.ui.combat = FUCombatTracker;
	}

	// Register status effects
	CONFIG.ActiveEffect.legacyTransferral = false;
	CONFIG.statusEffects = statusEffects;

	// Register sheet application classes
	Actors.unregisterSheet('core', ActorSheet);
	Actors.registerSheet('projectfu', FUStandardActorSheet, {
		makeDefault: true,
	});
	Items.unregisterSheet('core', ItemSheet);
	Items.registerSheet('projectfu', FUItemSheet, {
		makeDefault: true,
	});
	Items.registerSheet(SYSTEM, FUClassFeatureSheet, {
		types: ['classFeature'],
		makeDefault: true,
	});
	Items.registerSheet(SYSTEM, FUOptionalFeatureSheet, {
		types: ['optionalFeature'],
		makeDefault: true,
	});

	Hooks.on('getChatLogEntryContext', addRollContextMenuEntries);
	registerChatInteraction();

	registerClassFeatures(CONFIG.FU.classFeatureRegistry);
	registerOptionalFeatures(CONFIG.FU.optionalFeatureRegistry);

	Hooks.on('renderChatMessage', InlineElementsHowTo.activateListeners);
	Hooks.on('renderApplication', InlineElementsHowTo.activateListeners);
	Hooks.on('renderActorSheet', InlineElementsHowTo.activateListeners);
	Hooks.on('renderItemSheet', InlineElementsHowTo.activateListeners);

	CONFIG.TextEditor.enrichers.push(rolldataHtmlEnricher);

	CONFIG.TextEditor.enrichers.push(InlineDamage.enricher);
	Hooks.on('renderChatMessage', InlineDamage.activateListeners);
	Hooks.on('renderApplication', InlineDamage.activateListeners);
	Hooks.on('renderActorSheet', InlineDamage.activateListeners);
	Hooks.on('renderItemSheet', InlineDamage.activateListeners);
	Hooks.on('dropActorSheetData', InlineDamage.onDropActor);

	CONFIG.TextEditor.enrichers.push(...InlineResources.enrichers);
	Hooks.on('renderChatMessage', InlineResources.activateListeners);
	Hooks.on('renderApplication', InlineResources.activateListeners);
	Hooks.on('renderActorSheet', InlineResources.activateListeners);
	Hooks.on('renderItemSheet', InlineResources.activateListeners);
	Hooks.on('dropActorSheetData', InlineResources.onDropActor);

	CONFIG.TextEditor.enrichers.push(InlineIcon.enricher);

	InlineEffects.initialize();

	Hooks.on('dropCanvasData', CanvasDragDrop.onDropCanvasData);

	TextEditorCommandDropdown.initialize();

	SystemControls.initialize();

	PlayerListEnhancements.initialize();

	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('setup', () => {});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function () {
	var outStr = '';
	for (var arg in arguments) {
		if (typeof arguments[arg] != 'object') {
			outStr += arguments[arg];
		}
	}
	return outStr;
});

Handlebars.registerHelper('toLowerCase', function (str) {
	return str.toLowerCase();
});

Handlebars.registerHelper('translate', function (str) {
	const result = Object.assign(
		{
			spell: 'FU.Spell',
			hp: 'FU.HealthAbbr',
			mp: 'FU.MindAbbr',
			ip: 'FU.InventoryAbbr',
			shields: 'FU.Shield',
			arcanism: 'FU.Arcanism',
			chimerism: 'FU.Chimerism',
			elementalism: 'FU.Elementalism',
			entropism: 'FU.Entropism',
			ritualism: 'FU.Ritualism',
			spiritism: 'FU.Spiritism',
		},
		CONFIG.FU.itemTypes,
		CONFIG.FU.weaponTypes,
	);

	return result?.[str] ?? str;
});

Handlebars.registerHelper('getGameSetting', function (settingKey) {
	return game.settings.get('projectfu', settingKey);
});

Handlebars.registerHelper('capitalize', function (str) {
	if (str && typeof str === 'string') {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
	return str;
});

Handlebars.registerHelper('neq', function (a, b, options) {
	if (a !== b) {
		return options.fn(this);
	}
	return '';
});

Handlebars.registerHelper('half', function (value) {
	var num = Number(value);
	if (isNaN(num)) {
		return '';
	}
	return Math.floor(num / 2);
});

Handlebars.registerHelper('calculatePercentage', function (value, max) {
	value = parseFloat(value);
	max = parseFloat(max);
	const percentage = (value / max) * 100;
	return percentage.toFixed(2) + '%';
});

Handlebars.registerHelper('crisis', function (value, max) {
	value = parseFloat(value);
	max = parseFloat(max);
	const half = max / 2;
	return value <= half;
});

// Define a Handlebars helper to get the icon class based on item properties
Handlebars.registerHelper('getIconClass', function (item) {
	if (item.type === 'weapon') {
		if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'two-handed') {
			return 'ra ra-relic-blade ra-1xh  ra-flip-horizontal';
		} else if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'one-handed') {
			return 'ra ra-sword ra-1xh ra-flip-horizontal';
		} else if (item.system.isEquipped.slot === 'offHand') {
			return 'ra  ra-plain-dagger ra-1xh ra-rotate-180';
		}
	} else if (item.type === 'shield') {
		if (item.system.isDualShield && item.system.isDualShield.value) {
			return 'ra ra-heavy-shield ra-1xh';
		} else if (item.system.isEquipped.slot === 'offHand' || item.system.isEquipped.slot === 'mainHand') {
			return 'ra ra-shield ra-1xh';
		}
	} else if (item.type === 'armor') {
		if (item.system.isEquipped.slot === 'armor') {
			return 'ra ra-helmet ra-1xh';
		}
	} else if (item.type === 'accessory') {
		if (item.system.isEquipped.slot === 'accessory') {
			return 'fas fa-leaf ra-1xh';
		}
	}
	return 'fas fa-toolbox';
});

Handlebars.registerHelper('mathAbs', function (value) {
	return Math.abs(value);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

	Hooks.on('rollEquipment', (actor, slot) => {
		// Call the rollEquipment function
		rollEquipment(actor, slot);
	});

	Hooks.on('promptCheckCalled', (actor) => {
		if (!actor) {
			return ui.notification.error('No character for this user');
		}
		// Call promptCheck function
		promptCheck(actor);
	});

	Hooks.on('promptGroupCheckCalled', (actor) => {
		if (!actor) {
			return ui.notification.error('No character for this user');
		}
		let isShift = true;
		// Call Group Check promptCheck function
		GroupCheck.promptCheck(actor, isShift);
	});
});

Hooks.once('socketlib.ready', onSocketLibReady);

Hooks.once('mmo-hud.ready', () => {
	// Do this
});

Hooks.once('ready', () => {
	const isPixelated = game.settings.get('projectfu', 'optionImagePixelated');
	const applyPixelatedStyle = () => {
		// Apply the style to specific selectors
		$('img').css('image-rendering', isPixelated ? 'pixelated' : '');
	};
	// Apply the style initially
	applyPixelatedStyle();
});

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

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
	const validSlots = ['mainHand', 'offHand', 'armor', 'accessory'];
	if (!validSlots.includes(slot)) {
		ui.notifications.warn(`Invalid slot: ${slot}!`);
		return;
	}

	// Filter items based on the provided slot
	const sameSlotItems = actor.items.filter((item) => {
		return item.system.isEquipped && item.system.isEquipped.slot === slot;
	});

	// Check if any item is found in the specified slot
	if (sameSlotItems.length === 0) {
		ui.notifications.warn(`No item equipped in ${slot} slot!`);
		return;
	}

	// Get the first item from the filtered collection
	const item = sameSlotItems[0];

	// Roll the item
	item.roll(isShift);
}
