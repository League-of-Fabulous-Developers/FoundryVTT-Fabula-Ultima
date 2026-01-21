import { systemTemplatePath } from './system-utils.mjs';
import { ObjectUtils } from './object-utils.mjs';
import { FU } from './config.mjs';
import { TraitUtils } from '../pipelines/traits.mjs';

export const FUHandlebars = Object.freeze({
	registerHelpers: () => {
		Handlebars.registerHelper('pfuConcat', (...args) => {
			// remove hash argument
			args.pop();
			return args.join('');
		});

		Handlebars.registerHelper('pfuTranslate', function (str) {
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

		Handlebars.registerHelper('pfuGetSetting', function (settingKey) {
			return game.settings.get('projectfu', settingKey);
		});

		Handlebars.registerHelper('pfuCapitalize', function (str) {
			if (str && typeof str === 'string') {
				return str.charAt(0).toUpperCase() + str.slice(1);
			}
			return str;
		});

		Handlebars.registerHelper('pfuLocalizeTrait', function (trait) {
			if (trait && typeof trait === 'string') {
				return TraitUtils.localize(trait);
			}
			return trait;
		});

		Handlebars.registerHelper('pfuUppercase', function (str) {
			if (str && typeof str === 'string') {
				return str.toUpperCase();
			}
			return str;
		});

		Handlebars.registerHelper('pfuHalf', function (value) {
			var num = Number(value);
			if (isNaN(num)) {
				return '';
			}
			return Math.floor(num / 2);
		});

		Handlebars.registerHelper('pfuPercentage', function (value, max) {
			value = parseFloat(value);
			max = parseFloat(max);
			const percentage = (value / max) * 100;
			return percentage.toFixed(2) + '%';
		});

		// TODO: Needs a attribute like maxPercent
		Handlebars.registerHelper('pfuOverflowPercentage', function (value, max) {
			value = parseFloat(value);
			max = parseFloat(max);

			// Calculate overflow: (current - max) / (50% of max) * 100
			const maxPercent = 0.5; // This treats 150% of max as the maximum overflow (100% overflow bar width)
			const overflow = value - max;
			const overflowMax = max * maxPercent; // 50% of max is the maximum overflow
			const percentage = Math.min((overflow / overflowMax) * 100, 100); // Cap at 100%

			return percentage.toFixed(2) + '%';
		});

		Handlebars.registerHelper('pfuLookupById', function (items, itemId) {
			return items.find((item) => item._id === itemId);
		});

		Handlebars.registerHelper('pfuIconClass', function (icon) {
			if (!icon) {
				return '';
			}
			return FU.allIcon[icon];
		});

		Handlebars.registerHelper('pfuEquipmentIconClass', function (item, equippedItems) {
			if (!equippedItems) {
				return '';
			}
			return equippedItems.getClass(item);
		});

		Handlebars.registerHelper('pfuMathAbs', function (value) {
			return Math.abs(value);
		});

		Handlebars.registerHelper('pfuFormatMod', function (value) {
			if (value > 0) {
				return '+' + value;
			} else if (value < 0) {
				return value;
			}
			return value;
		});

		Handlebars.registerHelper('pfuCollectionContains', function (item, collection) {
			if (Array.isArray(collection)) {
				return collection.includes(item);
			}
			if (collection instanceof Map) {
				return collection.has(item);
			}
			if (collection instanceof Set) {
				return collection.has(item);
			}
			if (collection instanceof Object) {
				return item in collection;
			}
			return false;
		});

		Handlebars.registerHelper('pfuFormatResource', function (resourceValue, resourceMax, resourceName) {
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

		Handlebars.registerHelper('pfuMath', function (left, operator, right) {
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

		Handlebars.registerHelper('pfuClamp', (val, min, max) => {
			return Math.clamp(val, min, max);
		});

		Handlebars.registerHelper(
			'pfuCheckOutcome',
			/**
			 * @param result
			 * @param difficulty
			 */
			function (result, difficulty) {
				if (result.critical) {
					return 'critical';
				} else if (result.fumble) {
					return 'fumble';
				}

				if (Number.isInteger(difficulty)) {
					if (result.total >= difficulty) {
						return 'success';
					} else {
						return 'failure';
					}
				}

				return 'default';
			},
		);

		Handlebars.registerHelper('pfuProgress', progress);
		Handlebars.registerHelper('pfuProgressCollection', progressCollection);
		Handlebars.registerHelper('pfuAutoComplete', autoComplete);
		Handlebars.registerHelper('pfuTraits', traits);
		Handlebars.registerHelper('pfuIconAttribute', attributeIcon);
		Handlebars.registerHelper('pfuBadge', badge);
		Handlebars.registerHelper('pfuItemAnchor', itemAnchor);
		Handlebars.registerHelper('pfuCompendium', compendium);
	},
});

/* ----------------------------------------- */
/* PROGRESS TRACKS
/* ----------------------------------------- */

/**
 * @typedef ProgressHandlebarOptions
 * @property {Boolean} displayName
 * @property {String} type The type of item for the progress track. (Legacy support)
 * @property {Boolean} prompt Whether to support prompting a dialog to request a roll to affect this track
 * @property {Boolean} event Whether to dispatch an event on a change
 * @property {Boolean} controls
 * @property action
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
 * @returns {String}
 */
function progress(document, path, options) {
	const progress = foundry.utils.getProperty(document, path);
	return renderProgress(progress, document, path, options.hash);
}

/**
 * @param {FUActor|FUItem} document
 * @param {String} path
 * @param {int} index
 * @param {ProgressHandlebarOptions} options
 * @returns {String}
 */
function progressCollection(document, path, index, options) {
	const array = ObjectUtils.getProperty(document, path);
	const progress = array[index];
	return renderProgress(progress, document, path, options.hash, index);
}

/**
 * @param {ProgressDataModel} progress
 * @param {FUActor, FUItem} document The document
 * @param {String} path The path of the property
 * @param {int} index Optionally, the index of the data model inside an array
 * @param {ProgressHandlebarOptions} options
 * @returns {String}
 */
function renderProgress(progress, document, path, options, index = undefined) {
	const type = options.type;
	const style = options.style ?? progress.style ?? 'clock';
	const action = options.action ?? 'updateTrack';
	const controls = options.controls ?? true;

	// Render the partial directly using Handlebars
	const template = Handlebars.partials[progressStyleTemplates[style]];
	const html =
		typeof template === 'function'
			? template({
					arr: progress.progressArray,
					id: document._id,
					index: index,
					isCollection: index !== undefined,
					data: progress,
					dataPath: path,
					type: type,
					controls: controls,
					action: action,
					prompt: options.prompt,
					displayName: options.displayName && (progress.name || document.name),
				})
			: '';

	// Begin constructing HTML
	return new Handlebars.SafeString(html);
}

function autoComplete(context) {
	const dataset = context.hash;
	let options = dataset.options;
	if (typeof options === 'object') {
		options = Object.keys(options);
	}
	const template = Handlebars.partials[systemTemplatePath('common/auto-complete')];
	const html =
		typeof template === 'function'
			? template({
					name: dataset.name,
					value: dataset.value,
					options: options,
				})
			: '';
	return new Handlebars.SafeString(html);
}

/**
 * @param {TraitsDataModel|TraitsPredicateDataModel} model
 * @param {String} path The path to the property.
 * @param options
 * @returns {Handlebars.SafeString}
 */
function traits(model, path, options) {
	options = options.hash;
	const template = Handlebars.partials[systemTemplatePath('common/traits')];
	const html =
		typeof template === 'function'
			? template({
					model: model,
					path: path,
					traitOptions: model.schema.options?.options ?? {},
					quantifierOptions: FU.predicateQuantifier,
					showLabel: options.showLabel ?? true,
				})
			: '';
	return new Handlebars.SafeString(html);
}

/**
 * @typedef BadgeOptions
 * @property {String} label
 * @property {Number} value
 * @property {Boolean} compact
 * @property {'xs'|'s'|'m'|'l'|'xl'} size
 */

/**
 * @param {Attribute} attribute
 * @param {BadgeOptions} options
 * @returns {Handlebars.SafeString}
 */
function attributeIcon(attribute, options) {
	options.hash.label = FU.attributeAbbreviations[attribute];
	return badge(attribute, options);
}

/**
 * @param {String} key
 * @param {BadgeOptions} options
 * @returns {Handlebars.SafeString}
 */
function badge(key, options) {
	if (options.hash) {
		options = options.hash;
	}
	const icon = FU.allIcon[key];
	const size = options.size ?? 's';
	const template = Handlebars.partials[systemTemplatePath('common/icons/badge')];
	const html =
		typeof template === 'function'
			? template({
					icon: icon,
					label: options.label,
					size: size,
					value: options.value,
					compact: options.compact,
				})
			: '';
	return new Handlebars.SafeString(html);
}

/**
 * @typedef ItemAnchorOptions
 * @property {String} label
 * @property {String}
 * @property {'xs'|'s'|'m'|'l'|'xl'} size
 */

/**
 * @param {FUItem} item
 * @param {ItemAnchorOptions} options
 * @returns {Handlebars.SafeString}
 */
function itemAnchor(item, options) {
	if (options.hash) {
		options = options.hash;
	}

	const size = options.size ?? 's';
	const template = Handlebars.partials[systemTemplatePath('common/icons/item')];
	const html =
		typeof template === 'function'
			? template({
					name: item.name,
					uuid: item.uuid,
					id: item.id,
					img: item.img,
					pack: item.pack,
					size: size,
					classes: options?.classes,
				})
			: '';
	return new Handlebars.SafeString(html);
}

/**
 * @param {String} tab
 * @param {CompendiumFilterInputOptions} options
 * @returns {Handlebars.SafeString}
 */
function compendium(tab, options) {
	if (options.hash) {
		options = options.hash;
	}

	const template = Handlebars.partials[systemTemplatePath('common/icons/compendium')];
	const html =
		typeof template === 'function'
			? template({
					tab: tab,
					text: options.text,
					actorId: options.actorId,
					options: options,
				})
			: '';
	return new Handlebars.SafeString(html);
}
