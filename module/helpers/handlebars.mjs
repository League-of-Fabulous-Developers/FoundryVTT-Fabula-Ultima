import { systemTemplatePath } from './system-utils.mjs';
import { ObjectUtils } from './object-utils.mjs';

export const FUHandlebars = Object.freeze({
	registerHelpers: () => {
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
				CONFIG.FU.damageTypes,
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

		Handlebars.registerHelper('uppercase', function (str) {
			if (str && typeof str === 'string') {
				return str.toUpperCase();
			}
			return str;
		});

		Handlebars.registerHelper('neq', function (a, b, options) {
			if (a !== b) {
				return options.fn(this);
			}
			return '';
		});

		Handlebars.registerHelper('ifEquals', function (a, b, options) {
			if (a === b) {
				return options.fn(this);
			} else {
				return options.inverse ? options.inverse(this) : '';
			}
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

		// TODO: Needs a attribute like maxPercent
		Handlebars.registerHelper('calculateOverflowPercentage', function (value, max) {
			value = parseFloat(value);
			max = parseFloat(max);

			// Calculate overflow: (current - max) / (50% of max) * 100
			const maxPercent = 0.5; // This treats 150% of max as the maximum overflow (100% overflow bar width)
			const overflow = value - max;
			const overflowMax = max * maxPercent; // 50% of max is the maximum overflow
			const percentage = Math.min((overflow / overflowMax) * 100, 100); // Cap at 100%

			return percentage.toFixed(2) + '%';
		});

		Handlebars.registerHelper('crisis', function (value, max) {
			value = parseFloat(value);
			max = parseFloat(max);
			const half = max / 2;
			return value <= half;
		});

		Handlebars.registerHelper('lookupItemById', function (items, itemId) {
			return items.find((item) => item._id === itemId);
		});

		Handlebars.registerHelper('isItemEquipped', function (item, equippedItems) {
			if (!item || !equippedItems) {
				console.error('Item or equippedItems is missing.');
				return false;
			}
			return equippedItems.isEquipped(item);
		});

		// Define a Handlebars helper to get the icon class based on item properties
		Handlebars.registerHelper('getIconClass', function (item, equippedItems) {
			if (!equippedItems) {
				return '';
			}
			return equippedItems.getClass(item);
		});

		Handlebars.registerHelper('getSlot', function (item) {
			if (!item || !item.system) {
				return '';
			}
			if (item.type === 'weapon') {
				return item.system.hands.value === 'two-handed' ? 'mainHand' : 'offHand';
			} else if (item.type === 'shield') {
				return 'offHand';
			} else if (item.type === 'armor') {
				return 'armor';
			} else if (item.type === 'accessory') {
				return 'accessory';
			}
			return '';
		});

		Handlebars.registerHelper('mathAbs', function (value) {
			return Math.abs(value);
		});

		Handlebars.registerHelper('formatMod', function (value) {
			if (value > 0) {
				return '+' + value;
			} else if (value < 0) {
				return value;
			}
			return value;
		});

		Handlebars.registerHelper('inArray', function (item, array, options) {
			if (Array.isArray(array) && array.includes(item)) {
				return options.fn(this);
			} else {
				return options.inverse ? options.inverse(this) : '';
			}
		});

		Handlebars.registerHelper('inSet', function (item, set) {
			return set.has(item);
		});

		Handlebars.registerHelper('formatResource', function (resourceValue, resourceMax, resourceName) {
			// Convert value to a string to split into 3 digits
			const valueString = resourceValue.toString().padStart(3, '0');
			const isCrisis = resourceValue <= resourceMax / 2 && resourceName == 'HP';
			const digitBoxes = valueString
				.split('')
				.map(
					(digit) =>
						`<div class="digit-box${isCrisis ? ' crisis' : ''}">
            <span class="inner-shadow">
                <span class="number">${digit}</span>
            </span>
        </div>`,
				)
				.join('');

			return new Handlebars.SafeString(`<span>${resourceName}</span><span class="digit-row">${digitBoxes}</span>`);
		});

		Handlebars.registerHelper('math', function (left, operator, right) {
			left = parseFloat(left);
			right = parseFloat(right);
			return {
				'+': left + right,
				'-': left - right,
				'*': left * right,
				'/': left / right,
				'%': left % right,
			}[operator];
		});

		Handlebars.registerHelper('includes', function (array, value) {
			return Array.isArray(array) && array.includes(value);
		});

		Handlebars.registerHelper('get', (map, key) => ObjectUtils.getProperty(map, key));

		Handlebars.registerHelper('clamp', (val, min, max) => {
			return Math.max(Math.min(val, max), min);
		});

		Handlebars.registerHelper('progress', progress);
	},
});

/**
 * @typedef ProgressHandlebarOptions
 * @property {Boolean} displayName
 * @property {String} type
 * @property {"clock"|"basic"} style
 */

const progressStyleTemplates = Object.freeze({
	clock: systemTemplatePath('common/progress/progress-clock'),
	basic: systemTemplatePath('common/progress/progress-basic'),
	bar: systemTemplatePath('common/progress/progress-bar'),
});

/**
 * @param {FUActor|FUItem} document
 * @param {String} path
 * @param {ProgressHandlebarOptions} options
 */
function progress(document, path, options) {
	const id = document._id;
	const progress = foundry.utils.getProperty(document, path);

	const data = options.hash;
	const type = data.type;
	const style = data.style ?? 'clock';
	const action = data.action ?? 'updateProgress';

	// Render the partial directly using Handlebars
	const template = Handlebars.partials[progressStyleTemplates[style]];
	const html =
		typeof template === 'function'
			? template({
					arr: progress.progressArray,
					id: id,
					data: progress,
					dataPath: path,
					type: type,
					action: action,
					displayName: data.displayName && (progress.name || document.name),
				})
			: '';

	// Begin constructing HTML
	return new Handlebars.SafeString(html);
}
