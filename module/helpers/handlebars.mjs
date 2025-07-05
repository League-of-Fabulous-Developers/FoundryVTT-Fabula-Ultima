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

		Handlebars.registerHelper('get', (map, key) => map?.[key]);

		Handlebars.registerHelper('clamp', (val, min, max) => {
			return Math.max(Math.min(val, max), min);
		});

		Handlebars.registerHelper('progress', progress);
	},
});

/**
 * @param document
 * @param {Object} options
 */
function progress(document, options) {
	const id = document._id;
	const progress = document.system.progress;
	const tooltipInc = `${game.i18n.localize('FU.IncreaseTooltip')} (${progress.step})`;
	const tooltipDec = `${game.i18n.localize('FU.DecreaseTooltip')} (${progress.step})`;
	const data = options.hash;

	// Render the partial directly using Handlebars
	const partial = Handlebars.partials['systems/projectfu/templates/actor/partials/actor-progress-clock.hbs'];
	const clockHTML =
		typeof partial === 'function'
			? partial({
					arr: progress.progressArray,
					data: progress,
					dataPath: 'system.progress',
					displayName: data.displayName,
				})
			: '';

	// Begin constructing HTML
	const html = [];

	html.push(`<div class="item-m inline-desc clock-m" data-item-id="${id}" style="grid-column-gap: 2px;">`);

	// Optional increment button
	html.push(`
			<a class="increment-button" data-type="clockCounter" data-item-id="${id}"
			   data-tooltip="${tooltipInc}" data-action="updateClock" 
			   data-data-path="system.progress" data-update-amount="1">
				<i class="fas fa-plus"></i>
			</a>
		`);

	// Optional clock display
	html.push(`
			<div class="progress-container">
				${clockHTML}
			</div>
		`);

	// Optional decrement button
	html.push(`
			<a class="decrement-button" data-type="clockCounter" data-item-id="${id}"
			   data-action="updateClock" data-data-path="system.progress" data-update-amount="-1"
			   data-tooltip="${tooltipDec}">
				<i class="fas fa-minus"></i>
			</a>
		`);

	html.push(`</div>`);
	return new Handlebars.SafeString(html.join('\n'));
}
