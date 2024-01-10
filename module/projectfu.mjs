// Import document classes.
import { FUActor } from './documents/actor.mjs';
import { FUItem } from './documents/item.mjs';
// Import sheet classes.
import { FUStandardActorSheet } from './sheets/actor-standard-sheet.mjs';
import { FUItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FU } from './helpers/config.mjs';
import { registerSystemSettings } from './settings.js';

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
	CONFIG.Item.documentClass = FUItem;

	// Register system settings
	registerSystemSettings();

	CONFIG.statusEffects = [
		{
			id: 'accelerated',
			name: 'Accelerated',
			icon: 'systems/projectfu/styles/static/statuses/Accelerated.webp',
		},
		{
			id: 'aura',
			name: 'Aura',
			icon: 'systems/projectfu/styles/static/statuses/Aura.webp',
		},
		{
			id: 'barrier',
			name: 'Barrier',
			icon: 'systems/projectfu/styles/static/statuses/Barrier.webp',
		},
		{
			id: 'beserk',
			name: 'Beserk',
			icon: 'systems/projectfu/styles/static/statuses/Beserk.webp',
		},
		{
			id: 'blinded',
			name: 'Blinded',
			icon: 'systems/projectfu/styles/static/statuses/Blinded.webp',
		},
		{
			id: 'death',
			name: 'Death',
			icon: 'systems/projectfu/styles/static/statuses/Death.webp',
		},
		{
			id: 'dazed',
			name: 'Dazed',
			icon: 'systems/projectfu/styles/static/statuses/Dazed.webp',
			stats: ['ins'],
			mod: -2,
		},
		{
			id: 'dex-down',
			name: 'DEX Down',
			icon: 'systems/projectfu/styles/static/statuses/DexDown.webp',
			stats: ['dex'],
			mod: -2,
		},
		{
			id: 'dex-up',
			name: 'DEX Up',
			icon: 'systems/projectfu/styles/static/statuses/DexUp.webp',
			stats: ['dex'],
			mod: 2,
		},
		{
			id: 'enraged',
			name: 'Enraged',
			icon: 'systems/projectfu/styles/static/statuses/Enraged.webp',
			stats: ['dex', 'ins'],
			mod: -2,
		},
		{
			id: 'ins-down',
			name: 'INS Down',
			icon: 'systems/projectfu/styles/static/statuses/InsDown.webp',
			stats: ['ins'],
			mod: -2,
		},
		{
			id: 'ins-up',
			name: 'INS Up',
			icon: 'systems/projectfu/styles/static/statuses/InsUp.webp',
			stats: ['ins'],
			mod: 2,
		},
		{
			id: 'ko',
			name: 'KO',
			icon: 'systems/projectfu/styles/static/statuses/KO.webp',
		},
		{
			id: 'mig-down',
			name: 'MIG Down',
			icon: 'systems/projectfu/styles/static/statuses/MigDown.webp',
			stats: ['mig'],
			mod: -2,
		},
		{
			id: 'mig-up',
			name: 'MIG Up',
			icon: 'systems/projectfu/styles/static/statuses/MigUp.webp',
			stats: ['mig'],
			mod: 2,
		},
		{
			id: 'reflect',
			name: 'Reflect',
			icon: 'systems/projectfu/styles/static/statuses/Reflect.webp',
		},
		{
			id: 'regen',
			name: 'Regen',
			icon: 'systems/projectfu/styles/static/statuses/Regen.webp',
		},
		{
			id: 'shaken',
			name: 'Shaken',
			icon: 'systems/projectfu/styles/static/statuses/Shaken.webp',
			stats: ['wlp'],
			mod: -2,
		},
		{
			id: 'sleep',
			name: 'Sleep',
			icon: 'systems/projectfu/styles/static/statuses/Sleep.webp',
		},
		{
			id: 'slow',
			name: 'Slow',
			icon: 'systems/projectfu/styles/static/statuses/Slow.webp',
			stats: ['dex'],
			mod: -2,
		},
		{
			id: 'poisoned',
			name: 'Poisoned',
			icon: 'systems/projectfu/styles/static/statuses/Poisoned.webp',
			stats: ['mig', 'wlp'],
			mod: -2,
		},
		{
			id: 'weak',
			name: 'Weak',
			icon: 'systems/projectfu/styles/static/statuses/Weak.webp',
			stats: ['mig'],
			mod: -2,
		},
		{
			id: 'wlp-down',
			name: 'WLP Down',
			icon: 'systems/projectfu/styles/static/statuses/WlpDown.webp',
			stats: ['wlp'],
			mod: -2,
		},
		{
			id: 'wlp-up',
			name: 'WLP Up',
			icon: 'systems/projectfu/styles/static/statuses/WlpUp.webp',
			stats: ['wlp'],
			mod: 2,
		},
		{
			id: 'crisis',
			name: 'Crisis',
			icon: 'systems/projectfu/styles/static/statuses/Status_Bleeding.png',
		},
	];

	// Register sheet application classes
	Actors.unregisterSheet('core', ActorSheet);
	Actors.registerSheet('projectfu', FUStandardActorSheet, {
		makeDefault: true,
	});
	Items.unregisterSheet('core', ItemSheet);
	Items.registerSheet('projectfu', FUItemSheet, {
		makeDefault: true,
	});

	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

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

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.once('socketlib.ready', () => {
	const socket = socketlib.registerSystem('projectfu');
	socket.register('use', displayUsingText);
});

Hooks.once('mmo-hud.ready', () => {
	// Do this
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
		return false
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

function displayUsingText(text) {
	text = `${text}`;
	ui.notifications.queue.push({
		message: text,
		type: 'projectfu-spellname',
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
	if (ui.notifications.rendered) ui.notifications.fetch();
}
