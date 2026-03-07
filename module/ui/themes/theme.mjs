import { systemId } from '../../helpers/system-utils.mjs';
import { StringUtils } from '../../helpers/string-utils.mjs';
import { ThemeOptionFields, THEMES } from './theme-options.mjs';

/**
 * @desc A global UI theme that can be applied to the current world.
 * @implements ThemeOptions
 */
export class Theme {
	/**
	 * Creates a Theme instance.
	 * @param {object} data The data to construct the Theme from.
	 */
	constructor(data = {}) {
		const source = data && Object.keys(data).length > 0 ? data : THEMES.Default;
		Object.keys(this).forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				this[key] = source[key];
			}
		});
	}

	/**
	 * @param {Partial<ThemeOptions>} options
	 * @returns {Record<string, string>}
	 */
	static themeOptionsToCSSVars(options) {
		return Object.fromEntries(Object.entries(options).map(([key, value]) => [StringUtils.camelToKebab(key), value]));
	}

	/**
	 * @desc Convenient factory method for getting a Theme instance from passed in data.
	 * @param {*} themeData
	 * @returns {Theme} The passed in themeData if it was already an instance of Theme, or a Theme generated from the themeData.
	 */
	static from(themeData) {
		return themeData instanceof Theme ? themeData : new Theme(themeData);
	}

	/**
	 * @desc Applies this theme to the game world.
	 * @return {Promise}
	 */
	async apply() {
		// Get our generated style block, if it already exists.
		const $head = $('head');
		let $style = $head.find(`style#${systemId}`);
		// Generate a new style block to hold our styles if it doesn't already exist.
		if ($style.length <= 0) {
			$style = $(`<style id="${systemId}"></style>`);
			$head.append($style);
		}

		// Construct basic style content from theme string properties, excluding "advanced".
		const styleData = Object.keys(this)
			.filter((key) => key !== 'advanced')
			.map((themeKey) => {
				const themeType = ThemeOptionFields[themeKey]?.type;
				let themeValue = this[themeKey];
				if (themeType === 'image') {
					// Handle image values, including the case where no image is defined.
					if (!themeValue) {
						themeValue = 'url("")';
					} else
						try {
							const isRelativeUrl = new URL(document.baseURI).origin === new URL(themeValue, document.baseURI).origin;
							const prefix = isRelativeUrl ? '/' : '';
							themeValue = `url("${prefix}${themeValue}")`;
						} catch (e) {
							console.error(e);
							themeValue = 'url("")';
						}
				} else if (!themeValue || typeof themeValue !== 'string') return;
				const cssClass = StringUtils.camelToKebab(themeKey);
				const rule = `--pfu-${cssClass}: ${themeValue};`;
				return rule;
			})
			.filter((style) => style)
			.join('\n\t');

		// Generate style content from data.
		let styleContent = `:root {\n\t${styleData}\n}`;
		// Add advanced content.
		styleContent += `\n\n${this.advanced}`;

		$style.html(styleContent);

		// Add the ui accent to the left sidebar, if it doesn't already exist.
		$('#ui-left:not(:has(#ui-accent))').prepend('<div id="ui-accent"></div>');
		console.info(`The selected theme has been applied.`);
	}

	/**
	 * @desc Downloads a json file of containing this theme's data.
	 */
	exportToJson = function () {
		const data = JSON.stringify(foundry.utils.duplicate(this), null, 2);
		const filename = `${systemId}-theme.json`;
		const blob = new Blob([data], { type: 'text/json' });

		// Create an element to trigger the download
		let a = document.createElement('a');
		a.href = window.URL.createObjectURL(blob);
		a.download = filename;

		// Dispatch a click event to the element
		a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
		setTimeout(() => window.URL.revokeObjectURL(a.href), 100);
	};

	/**
	 * @desc Generates a Theme from a passed in json string.
	 * @param {string} json A json string containing the Theme data.
	 * @returns {Theme} The generated Theme.
	 */
	static async fromJSON(json) {
		const data = JSON.parse(json);
		return new Theme(data);
	}
}
