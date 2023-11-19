/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
	return loadTemplates([
		// Actor partials.
		'systems/fabulaultima/templates/actor/parts/actor-divider.html',
		'systems/fabulaultima/templates/actor/parts/actor-npc-skills.html',
		'systems/fabulaultima/templates/actor/parts/actor-equip.html',
		'systems/fabulaultima/templates/actor/parts/actor-control.html',
		'systems/fabulaultima/templates/actor/parts/actor-bonds.html',
		'systems/fabulaultima/templates/actor/parts/actor-favorite.html',
		'systems/fabulaultima/templates/actor/parts/actor-features.html',
		'systems/fabulaultima/templates/actor/parts/actor-items.html',
		'systems/fabulaultima/templates/actor/parts/actor-spells.html',
		'systems/fabulaultima/templates/actor/parts/actor-effects.html',
		'systems/fabulaultima/templates/actor/parts/actor-behavior.html',
		'systems/fabulaultima/templates/actor/parts/actor-crafts.html',
		'systems/fabulaultima/templates/actor/parts/actor-settings.html',

		// Item partials
		'systems/fabulaultima/templates/item/parts/item-header.html',
		'systems/fabulaultima/templates/item/parts/item-effects.html',
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

Handlebars.registerHelper('calculatePercentage', function (currentValue, maxValue) {
	// Calculate the percentage
	const percentage = (currentValue / maxValue) * 100;

	// Return the percentage as a string with two decimal places
	return percentage.toFixed(2) + '%';
});

// Define a Handlebars helper to get the non-abbreviated label based on the value
Handlebars.registerHelper('localizeFull', function (value) {
	// Define an object that maps values to non-abbreviated labels
	var affinityLabels = {
		0: 'FU.AffinityVulnurable',
		1: 'FU.AffinityNormal',
		2: 'FU.AffinityResistance',
		3: 'FU.AffinityImmune',
		4: 'FU.AffinityAbsorption',
		5: 'FU.AffinityRepulsion',
	};

	// Return the non-abbreviated label based on the value
	return affinityLabels[value];
});

Handlebars.registerHelper('affinity', function (affinity, options) {
	// Define an array of objects with the icon and label for each damage type
	var damageTypes = [
		{ icon: 'fas fa-sword', label: 'FU.DamageNormal' },
		{ icon: 'fas fa-wind', label: 'FU.DamageWind' },
		{ icon: 'fas fa-bolt-lightning', label: 'FU.DamageLightning' },
		{ icon: 'fas fa-moon', label: 'FU.DamageDark' },
		{ icon: 'fas fa-hill-rockslide', label: 'FU.DamageEarth' },
		{ icon: 'fas fa-fire icon-aff', label: 'FU.DamageFire' },
		{ icon: 'fas fa-snowflake icon-aff', label: 'FU.DamageIce' },
		{ icon: 'fas fa-sun icon-aff', label: 'FU.DamageLight' },
		{ icon: 'fas fa-skull-crossbones', label: 'FU.DamagePoison' },
	];

	// Initialize an empty string to store the output
	var output = '';

	// Loop through the damage types and the affinity object
	for (var i = 0; i < damageTypes.length; i++) {
		// Get the key and value of the current resistance property
		var key = Object.keys(affinity)[i];
		var value = affinity[key];

		// Create a new context object with the icon, label, name, and value
		var context = {
			icon: damageTypes[i].icon,
			label: damageTypes[i].label,
			name: 'system.resources.affinity.' + key,
			value: value,
		};

		// Execute the template block with the new context and append it to the output
		output += options.fn(context);
	}

	// Return the output
	return output;
});

// Define a Handlebars helper to get the icon class based on item properties
Handlebars.registerHelper('getIconClass', function (item) {
	if (item.type === 'weapon') {
		if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'two-handed') {
			return 'ra ra-sword ra-2x';
		} else if (item.system.isEquipped.slot === 'mainHand' && item.system.hands.value === 'one-handed') {
			return 'ra ra-plain-dagger ra-2x';
		} else if (item.system.isEquipped.slot === 'offHand') {
			return 'ra ra-crossed-swords ra-2x';
		}
	} else if (item.type === 'shield') {
		if (item.system.isEquipped.slot === 'mainHand' && item.system.isDualShield && item.system.isDualShield.value) {
			return 'ra ra-heavy-shield';
		} else if (item.system.isEquipped.slot === 'offHand' || item.system.isEquipped.slot === 'mainHand') {
			return 'ra ra-shield';
		}
	} else if (item.type === 'armor') {
		if (item.system.isEquipped.slot === 'armor') {
			return 'ra ra-helmet ra-2x';
		}
	} else if (item.type === 'accessory') {
		if (item.system.isEquipped.slot === 'accessory') {
			return 'fas fa-hat-wizard ra-2x';
		}
	}
	return 'fas fa-toolbox';
});

// Example layout for equipment slot handler
const itemData = {
	item: {
		system: {
			isEquipped: {
				value: true,
				slot: 'mainHand',
			},
		},
		type: 'weapon',
		system: {
			hands: {
				value: 'two-handed',
			},
		},
	},
};

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
