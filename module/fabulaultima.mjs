// Import document classes.
import { FUActor } from './documents/actor.mjs';
import { FUItem } from './documents/item.mjs';
// Import sheet classes.
import { FUActorSheet } from './sheets/actor-sheet.mjs';
import { FUItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { FU } from './helpers/config.mjs';

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
	game.fabulaultima = {
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

	// todo: selective options for choosing which automation to disable
	game.settings.register('fabulaultima', 'disableAutomation', {
		name: 'Disable Automation',
		hint: 'Toggle to disable automatic calculations for certain fields.',
		scope: 'world', // or "client" if it's a client-specific setting
		config: true,
		default: false, // Initial value
		type: Boolean,
	});

	CONFIG.statusEffects = [
		{
			id: 'accelerated',
			label: 'Accelerated',
			icon: 'systems/fabulaultima/styles/static/statuses/Accelerated.webp',
			stats: ['ins'],
			mod: 0,
		},
		{
			id: 'aura',
			label: 'Aura',
			icon: 'systems/fabulaultima/styles/static/statuses/Aura.webp',
			stats: ['ins'],
			mod: 0,
		},
		{
			id: 'barrier',
			label: 'Barrier',
			icon: 'systems/fabulaultima/styles/static/statuses/Barrier.webp',
			stats: ['ins'],
			mod: 0,
		},
		{
			id: 'dazed',
			label: 'Dazed',
			icon: 'systems/fabulaultima/styles/static/statuses/Dazed.webp',
			stats: ['ins'],
			mod: -2,
		},
		{
			id: 'dex-up',
			label: 'DEX Up',
			icon: 'systems/fabulaultima/styles/static/statuses/DexUp.webp',
			stats: ['dex'],
			mod: 2,
		},
		{
			id: 'enraged',
			label: 'Enraged',
			icon: 'systems/fabulaultima/styles/static/statuses/Enraged.webp',
			stats: ['dex', 'ins'],
			mod: -2,
		},
		{
			id: 'ins-up',
			label: 'INS Up',
			icon: 'systems/fabulaultima/styles/static/statuses/InsUp.webp',
			stats: ['ins'],
			mod: 2,
		},
		{
			id: 'ko',
			label: 'KO',
			icon: 'systems/fabulaultima/styles/static/statuses/KO.webp',
		},
		{
			id: 'mig-up',
			label: 'MIG Up',
			icon: 'systems/fabulaultima/styles/static/statuses/MigUp.webp',
			stats: ['mig'],
			mod: 2,
		},
		{
			id: 'shaken',
			label: 'Shaken',
			icon: 'systems/fabulaultima/styles/static/statuses/Shaken.webp',
			stats: ['wlp'],
			mod: -2,
		},
		{
			id: 'slow',
			label: 'Slow',
			icon: 'systems/fabulaultima/styles/static/statuses/Slow.webp',
			stats: ['dex'],
			mod: -2,
		},
		{
			id: 'poisoned',
			label: 'Poisoned',
			icon: 'systems/fabulaultima/styles/static/statuses/Poisoned.webp',
			stats: ['mig', 'wlp'],
			mod: -2,
		},
		{
			id: 'weak',
			label: 'Weak',
			icon: 'systems/fabulaultima/styles/static/statuses/Weak.webp',
			stats: ['mig'],
			mod: -2,
		},
		{
			id: 'wlp-up',
			label: 'WLP Up',
			icon: 'systems/fabulaultima/styles/static/statuses/WlpUp.webp',
			stats: ['wlp'],
			mod: 2,
		},
		{
			id: 'crisis',
			label: 'Crisis',
			icon: 'systems/fabulaultima/styles/static/statuses/Status_Bleeding.png',
			stats: ['ins'],
			mod: 0,
		},
	];

	// Register sheet application classes
	Actors.unregisterSheet('core', ActorSheet);
	Actors.registerSheet('fabulaultima', FUActorSheet, {
		makeDefault: true,
	});
	Items.unregisterSheet('core', ItemSheet);
	Items.registerSheet('fabulaultima', FUItemSheet, {
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
	const socket = socketlib.registerSystem('fabulaultima');
	socket.register('cast', displayCastingText);
	socket.register('use', displayUsingText);
});

Hooks.once('mmo-hud.ready', () => {
	// Do this
});

Hooks.on('renderSheet', (app, html, data) => {
	if (app.document.type === 'Actor' && app.document.isCharacter) {
		const linkActorDataSetting = game.settings.get('fabulaultima', 'linkActorData');

		// Check if the "Link Actor Data" setting is enabled (true or false)
		if (linkActorDataSetting) {
			// Modify the character sheet HTML to set "Link Actor Data" as default
			html.find('.link-actor-data').prop('checked', true);
		}
	}
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
	// First, determine if this is a valid owned item.
	if (data.type !== 'Item') return;
	if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
		return ui.notifications.warn('You can only create macro buttons for owned Items');
	}
	// If it is, retrieve it based on the uuid.
	const item = await Item.fromDropData(data);

	// Create the macro command using the uuid.
	const command = `game.fabulaultima.rollItemMacro("${data.uuid}");`;
	let macro = game.macros.find((m) => m.name === item.name && m.command === command);
	if (!macro) {
		macro = await Macro.create({
			name: item.name,
			type: 'script',
			img: item.img,
			command: command,
			flags: { 'fabulaultima.itemMacro': true },
		});
	}
	game.user.assignHotbarMacro(macro, slot);
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

function displayCastingText(text) {
	const user = this.actor;
	text = `${user} casts ${text}`;

	ui.notifications.queue.push({
		message: text,
		type: 'fabulaultima-spellname',
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
	if (ui.notifications.rendered) ui.notifications.fetch();
}

function displayUsingText(text) {
	const user = this.actor;
	text = `${user} uses ${text}`;

	ui.notifications.queue.push({
		message: text,
		type: 'fabulaultima-spellname',
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
	if (ui.notifications.rendered) ui.notifications.fetch();
}
