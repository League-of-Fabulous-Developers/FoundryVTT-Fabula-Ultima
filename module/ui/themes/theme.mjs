import { systemPath } from '../../helpers/config.mjs';
import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { ObjectUtils } from '../../helpers/object-utils.mjs';
import { systemId } from '../../helpers/system-utils.mjs';

/**
 * A global UI theme that can be applied to the current world.
 */
export class Theme {
	/**
	 * Creates a Theme instance.
	 * @param {object} data The data to construct the Theme from.
	 */
	constructor(data = {}) {
		Object.keys(this).forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				this[key] = data[key];
			}
		});
	}

	/**
	 * Convenient factory method for getting a Theme instance from passed in data.
	 *
	 * @param {*} themeData
	 * @returns {Theme} The passed in themeData if it was already an instance of Theme, or a Theme generated from the themeData.
	 */
	static from(themeData) {
		return themeData instanceof Theme ? themeData : new Theme(themeData);
	}

	/**
	 * @desc Applies this Theme to the game world.
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
				const themeType = THEME_OPTIONS[themeKey]?.type;
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
				const rule = `--pfu-${themeKey}: ${themeValue};`;
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
	}

	/**
	 * Downloads a json file of containing this theme's data.
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
	 * Opens a dialog that allows the user to import a Theme from an uploaded .json file.
	 *
	 * @returns {Promise<Theme>} A promise that resolves to the imported Theme.
	 */
	static async importFromJSONDialog() {
		return foundry.applications.api.DialogV2.wait(
			{
				title: game.i18n.localize(`FU.DialogImportThemeTitle`),
				content: await FoundryUtils.renderTemplate('ui/themes/import-theme-dialog.hbs'),
				buttons: {
					import: {
						icon: '<i class="fas fa-file-import"></i>',
						label: game.i18n.localize(`FU.DialogImportThemeThemeDataLabel`),
						callback: (html) => {
							const form = html.find('form')[0];
							if (!form.data.files.length) return ui.notifications.error(game.i18n.localize(`FU.ErrorNoFileUploaded`));
							return ObjectUtils.readTextFromFile(form.data.files[0]).then((json) => this.fromJSON(json));
						},
					},
					no: {
						icon: '<i class="fas fa-times"></i>',
						label: game.i18n.localize(`FU.Cancel`),
					},
				},
				default: 'import',
			},
			{
				width: 400,
			},
		);
	}

	/**
	 * Generates a Theme from a passed in json string.
	 *
	 * @param {string} json A json string containing the Theme data.
	 * @returns {Theme} The generated Theme.
	 */
	static async fromJSON(json) {
		const data = JSON.parse(json);
		return new Theme(data);
	}

	/* Controls - Default */
	'color-control-content' = '#ebf7afff';
	'color-control-border' = '#148782ff';
	'color-control-focus-content' = '#ffffffff';
	'color-control-inactive-content' = '#ebf7af80';
	'color-control-fill-1' = '#11292999';
	'color-control-fill-2' = '#49a49999';

	/* Controls - Highlight */
	'color-control-highlight-content' = '#047470ff';
	'color-control-highlight-border' = '#047470ff';
	'color-control-highlight-fill-1' = '#dcd374ff';
	'color-control-highlight-fill-2' = '#fff79aff';

	/* Controls - Active */
	'color-control-active-content' = '#fff79aff';
	'color-control-active-border' = '#fff79aff';
	'color-control-active-fill-1' = '#e28079cc';
	'color-control-active-fill-2' = '#f1a372cc';

	/* Apps - Default */
	'color-app-border' = '#148782ff';

	/* Apps - Header */
	'color-app-header-content' = '#ebf7afff';
	'color-app-header-focus-content' = '#ffffffff';
	'color-app-header-fill-1' = '#23574bdd';
	'color-app-header-fill-2' = '#011f13dd';

	/* Apps - Body */
	'color-app-body-content' = '#ebF7afff';
	'color-app-body-content-secondary' = '#ebF7afc0';
	'color-app-body-primary-fill-1' = '#112929e0';
	'color-app-body-primary-fill-2' = '#25544fe0';

	'color-app-name-section-content' = '#ebf7afff';
	'color-app-name-section-shadow' = '#000000ff';
	'color-app-name-section-fill-1' = '#532853ff';
	'color-app-name-section-fill-2' = '#bfb8c4ff';

	'color-app-control-content' = '#ebf7afff';
	'color-app-control-focus-content' = '#ffffffff';
	'color-app-control-border' = '#148782ff';
	'color-app-control-shadow' = '#2b4a42ff';
	'color-app-control-fill-1' = '#2b4a42ff';
	'color-app-control-fill-2' = '#2b4a42ff';
	'color-app-control-highlight-content' = '#047470ff';
	'color-app-control-highlight-border' = '#3A6359FF';
	'color-app-control-highlight-shadow' = '#3A6359FF';
	'color-app-control-highlight-fill-1' = '#dcd374ff';
	'color-app-control-highlight-fill-2' = '#fff79aff';
	'color-app-control-active-content' = '#fff79aff';
	'color-app-control-active-border' = '#753002ff';
	'color-app-control-active-shadow' = '#753002ff';
	'color-app-control-active-fill-1' = '#e28079cc';
	'color-app-control-active-fill-2' = '#f1a372cc';

	'color-app-image-fill-1' = '#2b4a42ff';
	'color-app-image-fill-2' = '#3d665aff';

	'color-app-item-header-content' = '#ebf7afff';
	'color-app-item-header-content-focus' = '#ffffffff';
	'color-app-item-header-fill-1' = '#2c584dff';
	'color-app-item-header-fill-2' = '#a0cdbcff';
	'color-app-item-header-shadow' = '#2b4a42ff';

	'color-app-item-highlight-border' = '#2b4a42ff';
	'color-app-item-highlight-fill-1' = '#e1efe3ff';
	'color-app-item-highlight-fill-2' = '#e1efe300';

	'color-app-clock-border' = '#2b4a42ff';
	'color-app-clock-fill-1' = '#2b4a42e0';
	'color-app-clock-fill-2' = '#2b4a42e0';
	'color-app-clock-bg-1' = '#ffffffb0';
	'color-app-clock-bg-2' = '#ffffffb0';

	'color-app-detail-section-content-primary' = '#272a2aff';
	'color-app-detail-section-content-secondary' = '#2b4a42ff';
	'color-app-detail-section-content-tertiary' = '#3d665aff';
	'color-app-detail-section-border' = '#c9c7b8ff';
	'color-app-detail-section-shadow' = '#2b4a42ff';
	'color-app-detail-section-label' = '#2b4a42ff';
	'color-app-detail-section-primary-fill-1' = '#d4e7e8ff';
	'color-app-detail-section-primary-fill-2' = '#c3dbd6b3';

	'color-app-section-content-primary' = '#191813ff';
	'color-app-section-content-secondary' = '#2b4a42ff';
	'color-app-section-content-tertiary' = '#4b4a44ff';
	'color-app-section-border' = '#aeb8a8ff';
	'color-app-section-primary-fill-1' = '#f5f5dcff';
	'color-app-section-primary-fill-2' = '#c9c7b8ff';
	'color-app-scrollbar' = '#5d142bff';
	'color-app-scrollbar-track' = '#00000000';

	'color-hud-background-fill-1' = '#49a499ff';
	'color-hud-background-fill-2' = '#49a499ff';

	'ui-accent-image' = '';
	'app-accent-image' = systemPath(`ui/Acento_highres.png`);
	'app-bg-image' = systemPath(`ui/HojitasDouble_highres.png`);
	'app-section-bg-image' = systemPath(`ui/Bkg_highres.png`);
	'sidebar-bg-image' = systemPath(`ui/Hojitas_highres.png`);

	/* Misc */
	'color-misc-shadow-primary' = '#77ebd7ff';
	'color-misc-shadow-highlight' = '#E03A3AFF';
	'color-misc-border-highlight' = '#E03A3ACC';
	'color-misc-scrollbar' = '#5d142bff';
	'color-misc-scrollbar-track' = '#00000000';

	advanced = [
		':root {',
		'  --pfu-ui-accent-width: 500px;',
		'  --pfu-ui-accent-height: 500px;',
		'  --pfu-ui-accent-position-top: -24px;',
		'  --pfu-ui-accent-position-left: 1px;',
		'  --pfu-ui-accent-clip-path: inset(0 370px 402px 0);',
		'  --pfu-app-accent-width: 200px;',
		'  --pfu-app-accent-height: 200px;',
		'  --pfu-app-accent-position-top: -42px;',
		'  --pfu-app-accent-position-left: -47px;',
		'  --pfu-border-radius-large: 20px;',
		'  --pfu-border-radius-medium: 10px;',
		'  --pfu-border-radius-small: 5px;',
		'  --pfu-border-width: 1px;',
		'  --pfu-app-section-bg-image-size: clamp(25%, 250px, 100%) auto;',
		'}',
	].join('\n');
}

export const THEME_OPTIONS = ObjectUtils.deepFreeze({
	/* Controls - Default */
	'color-control-content': {
		label: 'projectfu-theme.color-control-content.label',
		type: 'color',
	},
	'color-control-focus-content': {
		label: 'projectfu-theme.color-control-focus-content.label',
		type: 'color',
	},
	'color-control-inactive-content': {
		label: 'projectfu-theme.color-control-inactive-content.label',
		type: 'color',
	},
	'color-control-border': {
		label: 'projectfu-theme.color-control-border.label',
		type: 'color',
	},
	'color-control-fill-1': {
		label: 'projectfu-theme.color-control-fill-1.label',
		type: 'color',
	},
	'color-control-fill-2': {
		label: 'projectfu-theme.color-control-fill-2.label',
		type: 'color',
	},

	/* Controls - Highlight */
	'color-control-highlight-content': {
		label: 'projectfu-theme.color-control-highlight-content.label',
		type: 'color',
	},
	'color-control-highlight-border': {
		label: 'projectfu-theme.color-control-highlight-border.label',
		type: 'color',
	},
	'color-control-highlight-fill-1': {
		label: 'projectfu-theme.color-control-highlight-fill-1.label',
		type: 'color',
	},
	'color-control-highlight-fill-2': {
		label: 'projectfu-theme.color-control-highlight-fill-2.label',
		type: 'color',
	},

	/* Controls - Active */
	'color-control-active-content': {
		label: 'projectfu-theme.color-control-active-content.label',
		type: 'color',
	},
	'color-control-active-border': {
		label: 'projectfu-theme.color-control-active-border.label',
		type: 'color',
	},
	'color-control-active-fill-1': {
		label: 'projectfu-theme.color-control-active-fill-1.label',
		type: 'color',
	},
	'color-control-active-fill-2': {
		label: 'projectfu-theme.color-control-active-fill-2.label',
		type: 'color',
	},

	/* Apps - Default */
	'color-app-border': {
		label: 'projectfu-theme.color-app-border.label',
		type: 'color',
	},

	/* Apps - Header */
	'color-app-header-content': {
		label: 'projectfu-theme.color-app-header-content.label',
		type: 'color',
	},
	'color-app-header-focus-content': {
		label: 'projectfu-theme.color-app-header-focus-content.label',
		type: 'color',
	},
	'color-app-header-fill-1': {
		label: 'projectfu-theme.color-app-header-fill-1.label',
		type: 'color',
	},
	'color-app-header-fill-2': {
		label: 'projectfu-theme.color-app-header-fill-2.label',
		type: 'color',
	},
	'color-app-name-section-content': {
		label: 'projectfu-theme.color-app-name-section-content.label',
		type: 'color',
	},
	'color-app-name-section-shadow': {
		label: 'projectfu-theme.color-app-name-section-shadow.label',
		type: 'color',
	},
	'color-app-name-section-fill-1': {
		label: 'projectfu-theme.color-app-name-section-fill-1.label',
		type: 'color',
	},
	'color-app-name-section-fill-2': {
		label: 'projectfu-theme.color-app-name-section-fill-2.label',
		type: 'color',
	},
	/* Apps - Body */
	'color-app-body-content': {
		label: 'projectfu-theme.color-app-body-content.label',
		type: 'color',
	},
	'color-app-body-content-secondary': {
		label: 'projectfu-theme.color-app-body-content-secondary.label',
		type: 'color',
	},
	'color-app-body-primary-fill-1': {
		label: 'projectfu-theme.color-app-body-primary-fill-1.label',
		type: 'color',
	},
	'color-app-body-primary-fill-2': {
		label: 'projectfu-theme.color-app-body-primary-fill-2.label',
		type: 'color',
	},

	'color-app-control-content': {
		label: 'projectfu-theme.color-app-control-content.label',
		type: 'color',
	},
	'color-app-control-focus-content': {
		label: 'projectfu-theme.color-app-control-focus-content.label',
		type: 'color',
	},
	'color-app-control-border': {
		label: 'projectfu-theme.color-app-control-border.label',
		type: 'color',
	},
	'color-app-control-shadow': {
		label: 'projectfu-theme.color-app-control-shadow.label',
		type: 'color',
	},
	'color-app-control-fill-1': {
		label: 'projectfu-theme.color-app-control-fill-1.label',
		type: 'color',
	},
	'color-app-control-fill-2': {
		label: 'projectfu-theme.color-app-control-fill-2.label',
		type: 'color',
	},
	'color-app-control-highlight-content': {
		label: 'projectfu-theme.color-app-control-highlight-content.label',
		type: 'color',
	},
	'color-app-control-highlight-border': {
		label: 'projectfu-theme.color-app-control-highlight-border.label',
		type: 'color',
	},
	'color-app-control-highlight-shadow': {
		label: 'projectfu-theme.color-app-control-highlight-shadow.label',
		type: 'color',
	},
	'color-app-control-highlight-fill-1': {
		label: 'projectfu-theme.color-app-control-highlight-fill-1.label',
		type: 'color',
	},
	'color-app-control-highlight-fill-2': {
		label: 'projectfu-theme.color-app-control-highlight-fill-2.label',
		type: 'color',
	},
	'color-app-control-active-content': {
		label: 'projectfu-theme.color-app-control-active-content.label',
		type: 'color',
	},
	'color-app-control-active-border': {
		label: 'projectfu-theme.color-app-control-active-border.label',
		type: 'color',
	},
	'color-app-control-active-shadow': {
		label: 'projectfu-theme.color-app-control-active-shadow.label',
		type: 'color',
	},
	'color-app-control-active-fill-1': {
		label: 'projectfu-theme.color-app-control-active-fill-1.label',
		type: 'color',
	},
	'color-app-control-active-fill-2': {
		label: 'projectfu-theme.color-app-control-active-fill-2.label',
		type: 'color',
	},

	'color-app-item-header-content': {
		label: 'projectfu-theme.color-app-item-header-content.label',
		type: 'color',
	},
	'color-app-item-header-content-focus': {
		label: 'projectfu-theme.color-app-item-header-content-focus.label',
		type: 'color',
	},
	'color-app-item-header-fill-1': {
		label: 'projectfu-theme.color-app-item-header-fill-1.label',
		type: 'color',
	},
	'color-app-item-header-fill-2': {
		label: 'projectfu-theme.color-app-item-header-fill-2.label',
		type: 'color',
	},
	'color-app-item-header-shadow': {
		label: 'projectfu-theme.color-app-item-header-shadow.label',
		type: 'color',
	},
	'color-app-item-highlight-border': {
		label: 'projectfu-theme.color-app-item-highlight-border.label',
		type: 'color',
	},
	'color-app-item-highlight-fill-1': {
		label: 'projectfu-theme.color-app-item-highlight-fill-1.label',
		type: 'color',
	},
	'color-app-item-highlight-fill-2': {
		label: 'projectfu-theme.color-app-item-highlight-fill-2.label',
		type: 'color',
	},

	'color-app-clock-border': {
		label: 'projectfu-theme.color-app-clock-border.label',
		type: 'color',
	},
	'color-app-clock-fill-1': {
		label: 'projectfu-theme.color-app-clock-fill-1.label',
		type: 'color',
	},
	'color-app-clock-fill-2': {
		label: 'projectfu-theme.color-app-clock-fill-2.label',
		type: 'color',
	},
	'color-app-clock-bg-1': {
		label: 'projectfu-theme.color-app-clock-bg-1.label',
		type: 'color',
	},
	'color-app-clock-bg-2': {
		label: 'projectfu-theme.color-app-clock-bg-2.label',
		type: 'color',
	},

	'color-app-image-fill-1': {
		label: 'projectfu-theme.color-app-image-fill-1.label',
		type: 'color',
	},
	'color-app-image-fill-2': {
		label: 'projectfu-theme.color-app-image-fill-2.label',
		type: 'color',
	},

	'color-app-section-content-primary': {
		label: 'projectfu-theme.color-app-section-content-primary.label',
		type: 'color',
	},
	'color-app-section-content-secondary': {
		label: 'projectfu-theme.color-app-section-content-secondary.label',
		type: 'color',
	},
	'color-app-section-content-tertiary': {
		label: 'projectfu-theme.color-app-section-content-tertiary.label',
		type: 'color',
	},

	'color-app-section-border': {
		label: 'projectfu-theme.color-app-section-border.label',
		type: 'color',
	},
	'color-app-section-primary-fill-1': {
		label: 'projectfu-theme.color-app-section-primary-fill-1.label',
		type: 'color',
	},
	'color-app-section-primary-fill-2': {
		label: 'projectfu-theme.color-app-section-primary-fill-2.label',
		type: 'color',
	},

	'color-app-detail-section-content-primary': {
		label: 'projectfu-theme.color-app-detail-section-content-primary.label',
		type: 'color',
	},
	'color-app-detail-section-content-secondary': {
		label: 'projectfu-theme.color-app-detail-section-content-secondary.label',
		type: 'color',
	},
	'color-app-detail-section-content-tertiary': {
		label: 'projectfu-theme.color-app-detail-section-content-tertiary.label',
		type: 'color',
	},
	'color-app-detail-section-shadow': {
		label: 'projectfu-theme.color-app-detail-section-shadow.label',
		type: 'color',
	},
	'color-app-detail-section-primary-fill-1': {
		label: 'projectfu-theme.color-app-detail-section-primary-fill-1.label',
		type: 'color',
	},
	'color-app-detail-section-primary-fill-2': {
		label: 'projectfu-theme.color-app-detail-section-primary-fill-2.label',
		type: 'color',
	},

	'color-app-scrollbar': {
		label: 'projectfu-theme.color-app-scrollbar.label',
		type: 'color',
	},
	'color-app-scrollbar-track': {
		label: 'projectfu-theme.color-app-scrollbar-track.label',
		type: 'color',
	},

	/* Combat Hud */
	'color-hud-background-fill-1': {
		label: 'projectfu-theme.color-hud-background-fill-1.label',
		type: 'color',
	},
	'color-hud-background-fill-2': {
		label: 'projectfu-theme.color-hud-background-fill-2.label',
		type: 'color',
	},

	/* Misc */
	'color-misc-shadow-primary': {
		label: 'projectfu-theme.color-misc-shadow-primary.label',
		type: 'color',
	},
	'color-misc-shadow-highlight': {
		label: 'projectfu-theme.color-misc-shadow-highlight.label',
		type: 'color',
	},
	'color-misc-border-highlight': {
		label: 'projectfu-theme.color-misc-border-highlight.label',
		type: 'color',
	},
	'ui-accent-image': {
		label: 'projectfu-theme.ui-accent-image.label',
		type: 'image',
	},
	'app-accent-image': {
		label: 'projectfu-theme.app-accent-image.label',
		type: 'image',
	},
	'app-bg-image': {
		label: 'projectfu-theme.app-bg-image.label',
		type: 'image',
	},
	'app-section-bg-image': {
		label: 'projectfu-theme.app-section-bg-image.label',
		type: 'image',
	},
	'sidebar-bg-image': {
		label: 'projectfu-theme.sidebar-bg-image.label',
		type: 'image',
	},
	advanced: {
		label: 'projectfu-theme.advanced.label',
		hint: 'projectfu-theme.advanced.hint',
		type: 'multiline-text',
	},
});

export const THEMES = ObjectUtils.deepFreeze({
	Default: new Theme(),
	BlueTechno: new Theme({
		'color-control-content': '#F7FEFFFF',
		'color-control-border': '#ADC9FF80',
		'color-control-focus-content': '#F7FEFFFF',
		'color-control-inactive-content': '#F7FEFF80',
		'color-control-fill-1': '#2D388599',
		'color-control-fill-2': '#4758D199',
		'color-control-highlight-content': '#3C4685FF',
		'color-control-highlight-border': '#6F83D1FF',
		'color-control-highlight-fill-1': '#D9ECFFFF',
		'color-control-highlight-fill-2': '#F7FEFFFF',
		'color-control-active-content': '#F7FEFFFF',
		'color-control-active-border': '#F7FEFFB3',
		'color-control-active-fill-1': '#7D7D7DCC',
		'color-control-active-fill-2': '#E3E3E3CC',
		'color-app-border': '#00000000',
		'color-app-header-content': '#F7FEFFFF',
		'color-app-header-focus-content': '#FFFFFFFF',
		'color-app-header-fill-1': '#3A4587DD',
		'color-app-header-fill-2': '#0F1224DD',
		'color-app-body-content': '#F7FEFFFF',
		'color-app-body-content-secondary': '#F7FEFFC0',
		'color-app-body-focus-content': '#FFFFFFFF',
		'color-app-body-primary-fill-1': '#101129FF',
		'color-app-body-primary-fill-2': '#28275CFF',
		'color-app-name-section-content': '#F7FEFFFF',
		'color-app-name-section-shadow': '#000000FF',
		'color-app-name-section-fill-1': '#532853FF',
		'color-app-name-section-fill-2': '#5328538C',
		'color-app-control-content': '#D6F9FFFF',
		'color-app-control-border': '#D6F9FF5C',
		'color-app-control-shadow': '#2D3885FF',
		'color-app-control-fill-1': '#2D3885FF',
		'color-app-control-fill-2': '#2D3885FF',
		'color-app-control-highlight-content': '#2D3885FF',
		'color-app-control-highlight-border': '#2D3885FF',
		'color-app-control-highlight-shadow': '#2D3885FF',
		'color-app-control-highlight-fill-1': '#D6F9FFFF',
		'color-app-control-highlight-fill-2': '#D6F9FFFF',
		'color-app-control-active-content': '#2D3885FF',
		'color-app-control-active-border': '#2D3885FF',
		'color-app-control-active-shadow': '#2D3885FF',
		'color-app-control-active-fill-1': '#D6F9FFFF',
		'color-app-control-active-fill-2': '#D6F9FFFF',
		'color-app-image-fill-1': '#303573FF',
		'color-app-image-fill-2': '#3A49A1FF',
		'color-app-item-header-content': '#F8F7FFFF',
		'color-app-item-header-content-focus': '#D6F9FFFF',
		'color-app-item-header-fill-1': '#2D3885FF',
		'color-app-item-header-fill-2': '#A1DAFFFF',
		'color-app-item-header-shadow': '#2D3885FF',
		'color-app-item-highlight-border': '#2D3885FF',
		'color-app-item-highlight-fill-1': '#D6F9FFFF',
		'color-app-item-highlight-fill-2': '#D6F9FF00',
		'color-app-clock-border': '#1E2559FF',
		'color-app-clock-fill-1': '#2D3885E0',
		'color-app-clock-fill-2': '#2D3885E0',
		'color-app-clock-bg-1': '#FFFFFFB0',
		'color-app-clock-bg-2': '#FFFFFFB0',
		'color-app-detail-section-content-primary': '#272A2AFF',
		'color-app-detail-section-content-secondary': '#1E2559FF',
		'color-app-detail-section-content-tertiary': '#4B4A44FF',
		'color-app-detail-section-border': '#c9c7b8ff',
		'color-app-detail-section-shadow': '#2D3885FF',
		'color-app-detail-section-label': '#2b4a42ff',
		'color-app-detail-section-primary-fill-1': '#D6F9FFFF',
		'color-app-detail-section-primary-fill-2': '#D6F9FFA3',
		'color-app-section-content-primary': '#191813FF',
		'color-app-section-content-secondary': '#1E2559FF',
		'color-app-section-content-tertiary': '#4B4A44FF',
		'color-app-section-border': '#F8F7FFE0',
		'color-app-section-primary-fill-1': '#F8F7FFE0',
		'color-app-section-primary-fill-2': '#F5F5FFED',
		'color-app-scrollbar': '#F8F7FFE0',
		'color-app-scrollbar-track': '',
		'color-hud-background-fill-1': '#2D3885FF',
		'color-hud-background-fill-2': '#2D3885FF',
		'ui-accent-image': '',
		'app-accent-image': '',
		'app-bg-image': 'modules/projectfu-theme/assets/images/Page_deco.png',
		'app-section-bg-image': '',
		'sidebar-bg-image': 'modules/projectfu-theme/assets/images/Page_deco_half.png',
		'color-misc-shadow-primary': '#73BEFFFF',
		'color-misc-shadow-highlight': '#F78946FF',
		'color-misc-border-highlight': '#F78946CC',
		advanced:
			':root {\n  --pfu-ui-accent-width: 70px;\n  --pfu-ui-accent-height: auto;\n  --pfu-ui-accent-position-top: -111px;\n  --pfu-ui-accent-position-left: 72px;\n  --pfu-ui-accent-clip-path: unset;\n  --pfu-border-radius-large: 20px;\n  --pfu-border-radius-medium: 10px;\n  --pfu-border-radius-small: 5px;\n  --pfu-border-width: 0.1em;\n  --pfu-control-shadow: 0 0 10px var(--color-shadow-dark);\n}\n\n#ui-accent {\n  transform: rotate(90deg) scaleY(-1);\n}\n\n#chat-form #chat-message {\n  background: var(--pfu-color-app-section-primary-fill);\n}',
	}),
});
