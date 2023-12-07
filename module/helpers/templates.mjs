/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
	return loadTemplates([
		// Actor Section partials.
		'systems/fabulaultima/templates/actor/sections/actor-section-classes.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-features.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-spells.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-items.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-combat.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-effects.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-behavior.hbs',
		'systems/fabulaultima/templates/actor/sections/actor-section-settings.hbs',

		// Actor Component partials.
		'systems/fabulaultima/templates/actor/partials/actor-actions.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-affinities.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-attributes.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-statistics.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-resources.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-resource-points.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-traits.hbs',

		'systems/fabulaultima/templates/actor/partials/actor-item-name.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-actions.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-npc-items.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-npc-skills.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-favorite.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-bonds.hbs',

		'systems/fabulaultima/templates/actor/partials/actor-divider.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-equip.hbs',
		'systems/fabulaultima/templates/actor/partials/actor-control.hbs',

		// Item partials
		'systems/fabulaultima/templates/item/partials/item-header.hbs',
		'systems/fabulaultima/templates/item/partials/item-effects.hbs',
		'systems/fabulaultima/templates/item/partials/item-controls.hbs',
		'systems/fabulaultima/templates/item/partials/item-weaponize.hbs',
		'systems/fabulaultima/templates/item/partials/item-defensive.hbs',
		'systems/fabulaultima/templates/item/partials/item-spellify.hbs',
	]);
};

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

// Register a Handlebars helper for generating stars
Handlebars.registerHelper('generateStars', function (current, max) {
	let stars = '';
	for (let i = 0; i < current; i++) {
		stars += '<div class="rollable fusl fus-sl-star"></div>';
	}
	for (let i = 0; i < max - current; i++) {
		stars += '<div class="rollable fusl ful-sl-star"></div>';
	}
	return new Handlebars.SafeString(stars);
});

// Define a Handlebars helper to get the icon class based on item properties
Handlebars.registerHelper('getIconClass', function (item) {
	if (item.type === 'weapon') {
		if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'two-handed') {
			return 'ra ra-relic-blade ra-2x  ra-flip-horizontal';
		} else if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'one-handed') {
			return 'ra ra-sword ra-2x ra-flip-horizontal';
		} else if (item.system.isEquipped.slot === 'offHand') {
			return 'ra  ra-plain-dagger ra-2x ra-rotate-180';
		}
	} else if (item.type === 'shield') {
		if (item.system.isDualShield && item.system.isDualShield.value) {
			return 'ra ra-heavy-shield ra-2x';
		} else if (item.system.isEquipped.slot === 'offHand' || item.system.isEquipped.slot === 'mainHand') {
			return 'ra ra-shield ra-2x';
		}
	} else if (item.type === 'armor') {
		if (item.system.isEquipped.slot === 'armor') {
			return 'ra ra-helmet ra-2x';
		}
	} else if (item.type === 'accessory') {
		if (item.system.isEquipped.slot === 'accessory') {
			return 'fas fa-leaf ra-2x';
		}
	}
	return 'fas fa-toolbox';
});

// Example layout for equipment slot handler
// const itemData = {
// 	item: {
// 		system: {
// 			isEquipped: {
// 				value: true,
// 				slot: 'mainHand',
// 			},
// 		},
// 		type: 'weapon',
// 		system: {
// 			hands: {
// 				value: 'two-handed',
// 			},
// 		},
// 	},
// };
