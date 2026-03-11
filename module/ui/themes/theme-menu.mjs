import FUApplication from '../application.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { Theme } from './theme.mjs';
import { getSystemSetting, setSystemSetting } from '../../settings.js';
import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { ThemeOptionFields, Themes } from './theme-options.mjs';
import { FileUtils } from '../../helpers/file-utils.mjs';

/**
 * A form for viewing and updating theme settings.
 */
export class ThemeMenu extends FUApplication {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['fu-form'],
		window: {
			title: 'FU.ThemeMenuName',
			icon: 'fas fa-palette',
		},
		form: { closeOnSubmit: false },
		actions: {
			changeTheme: ThemeMenu.#changeTheme,
			importTheme: ThemeMenu.#importTheme,
			exportTheme: ThemeMenu.#exportTheme,
			applyTheme: ThemeMenu.#applyTheme,
			saveTheme: ThemeMenu.#saveTheme,
		},
		position: { width: 600 },
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		main: {
			template: systemTemplatePath(`ui/themes/theme-menu`),
		},
	};

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.current = getSystemSetting('theme');
		const themes = await Themes.getSystemThemes();
		context.fields = ThemeOptionFields;
		context.themes = themes;
		return context;
	}

	/**
	 * @desc Updates the theme upon form submission.
	 * @param {Event} event The submit event that initiated the update.
	 * @param {*} formData The data collected from the submitted form.
	 */
	_updateObject(event, formData) {
		const data = foundry.utils.expandObject(formData);
		setSystemSetting('theme', data);
		console.info(`Set theme data`);
	}

	setThemeFields(form, themeData) {
		for (const element of form.elements) {
			if (!element.name) continue;
			if (!(element.name in themeData)) continue;

			element.value = themeData[element.name] ?? '';
		}
	}

	/**
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'main': {
				// Unset the theme when any other field changes
				const themeSelect = element.querySelector('select[name="theme"]');
				if (!themeSelect) return;

				// Target all inputs and textareas inside <main>, excluding the theme select
				const fields = element.querySelectorAll('main input, main textarea');
				for (const field of fields) {
					field.addEventListener('change', () => {
						themeSelect.value = '';
					});
				}

				const resetButton = element.querySelector('button[name="reset"]');
				if (resetButton) {
					resetButton.addEventListener('click', () => {
						const fields = element.querySelectorAll('main input, main textarea');
						for (const field of fields) {
							field.value = field.defaultValue;
						}
						// Also reset the theme select to its default
						themeSelect.value = themeSelect.options[0].value;
					});
				}
			}
		}
	}

	/**
	 * @desc Opens a dialog that allows the user to import a Theme from an uploaded .json file.
	 * @returns {Promise<Theme>} A promise that resolves to the imported Theme.
	 */
	static async importFromJSONDialog() {
		return foundry.applications.api.DialogV2.wait(
			{
				window: { title: game.i18n.localize('FU.DialogImportThemeTitle') },
				classes: ['projectfu', 'backgroundstyle', 'fu-dialog'],
				content: await FoundryUtils.renderTemplate('ui/themes/import-theme-dialog'),
				buttons: [
					{
						action: 'import',
						icon: 'fas fa-file-import',
						label: game.i18n.localize('FU.Import'),
						callback: (event, button, dialog) => {
							const fileInput = dialog.querySelector('input[type="file"]');

							if (!fileInput?.files?.length) {
								ui.notifications.error(game.i18n.localize('FU.ErrorNoFileUploaded'));
								return false; // Keeps dialog open
							}

							return FileUtils.readTextFromFile(fileInput.files[0]).then((json) => Theme.fromJSON(json));
						},
					},
					{
						action: 'cancel',
						icon: 'fas fa-times',
						label: game.i18n.localize('FU.Cancel'),
					},
				],
				default: 'cancel',
			},
			{
				width: 400,
			},
		);
	}

	/**
	 * @this ThemeMenu
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #importTheme(event, target) {
		const theme = await ThemeMenu.importFromJSONDialog();
		if (!theme) {
			console.warn(`Failed to import theme`);
			return;
		}

		const form = target.closest('form');
		const select = form.querySelector('select[name="theme"]');
		const value = select?.value;
		if (!value) {
			console.warn(`No theme was selected to import.`);
			return;
		}
		this.setThemeFields(form, theme);
		ui.notifications.info(`Imported theme ${value}`);
	}

	/**
	 * @this ThemeMenu
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #exportTheme(event, target) {
		const form = target.closest('form');
		const data = foundry.utils.expandObject(Object.fromEntries(new FormData(form)));
		new Theme(data).exportToJson();
	}

	/**
	 * @this ThemeMenu
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #changeTheme(event, target) {
		const value = event.target.value;
		if (!value) return;

		// Set color fields and their associated color pickers when a theme is selected
		const form = target.closest('form');
		const themes = await Themes.getSystemThemes();
		const theme = themes[value];
		if (theme) {
			this.setThemeFields(form, theme);
		}
	}

	/**
	 * @this ThemeMenu
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #applyTheme(event, target) {
		const data = FoundryUtils.getFormData(target);
		const theme = new Theme(data);
		return theme.apply();
	}

	/**
	 * @this ThemeMenu
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @param formData
	 * @returns {Promise<void>}
	 */
	static async #saveTheme(event, target, formData) {
		const data = FoundryUtils.getFormData(target);
		setSystemSetting('theme', data);
		console.info(`Set theme data`);
	}
}
