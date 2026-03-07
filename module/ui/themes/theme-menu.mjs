import FUApplication from '../application.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { Theme, THEME_OPTIONS, THEMES } from './theme.mjs';
import { getSystemSetting, setSystemSetting } from '../../settings.js';

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
			icon: 'fas fa-color',
		},
		form: { closeOnSubmit: false },
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
		context.settings = THEME_OPTIONS;
		context.themes = THEMES;
		return context;
	}

	/**
	 * Updates the theme upon form submission.
	 *
	 * @param {Event} event The submit event that initiated the update.
	 * @param {*} formData The data collected from the submitted form.
	 */
	_updateObject(event, formData) {
		const data = foundry.utils.expandObject(formData);
		setSystemSetting('theme', data);
	}

	/**
	 * Populates the form fields with the data for the theme.
	 *
	 * @param {jQuery} form A jQuery object containing the form element.
	 * @param {object} themeData The theme data.
	 */
	setThemeFields(form, themeData) {
		Object.keys(themeData).forEach((themeKey) => {
			const themeEntry = themeData[themeKey];
			const input = form.find(`input[name="${themeKey}"]`);
			input.val(themeEntry).each((i, inputElement) => {
				// Update color picker for this input, if enabled.
				inputElement.jscolor?.processValueInput(themeEntry);
			});
		});
		const advancedTextArea = form.find('textarea[name="advanced"]');
		advancedTextArea.val(themeData.advanced);
	}

	/**
	 *
	 * @param {jQuery} form A jQuery object containing the form element.
	 */
	activateListeners(form) {
		super.activateListeners(form);
		// Enable color pickers.
		// eslint-disable-next-line no-undef
		form.each((i, element) => ColorPicker.install(element));
		// Reset color pickers on form reset.
		form.on('reset', (event) => {
			// Defer execution until after the event has been fully resolved and fields have been reset.
			setTimeout(() => {
				form.find('.jscolor').each((i, colorElement) => {
					colorElement.jscolor.processValueInput(colorElement.value);
				});
			}, 0);
		});
		// Set color fields and their associated color pickers when a theme is selected.
		form.find('select[name="theme"]').on('change', (event) => {
			const value = $(event.target).val();
			if (value) {
				const theme = THEMES[value];
				if (theme) {
					this.setThemeFields(form, theme);
				}
			}
		});
		// Unset the theme when any other field changes.
		form.find('.form-fields :input:not(select[name="theme"])').on('change', (event) => {
			const themeSelect = form.find('select[name="theme"]');
			themeSelect.val('');
		});
		form.find('button[name="export"]').on('click', (event) => {
			const data = foundry.utils.expandObject(new FormData(form[0]));
			new Theme(Object.fromEntries(data)).exportToJson();
		});
		form.find('button[name="import"]').on('click', async (event) => {
			const theme = await Theme.importFromJSONDialog();
			if (theme) {
				this.setThemeFields(form, theme);
				const themeSelect = form.find('select[name="theme"]');
				themeSelect.val('');
			}
		});
	}
}
