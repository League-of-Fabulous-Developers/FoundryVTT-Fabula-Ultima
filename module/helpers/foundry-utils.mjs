import { StringUtils } from './string-utils.mjs';
import { systemTemplatePath } from './system-utils.mjs';
import { TextEditor } from './text-editor.mjs';

const { api, fields, handlebars } = foundry.applications;

/**
 * @typedef FormSelectOption
 * @property {string} [value]
 * @property {string} [label]
 * @property {string} [group]
 * @property {boolean} [disabled]
 * @property {boolean} [selected]
 * @property {boolean} [rule]
 * @property {Record<string, string>} [dataset]
 */

/**
 * @callback DialogV2ButtonCallback
 * @param {PointerEvent|SubmitEvent} event        The button click event, or a form submission event if the dialog was
 *                                                submitted via keyboard.
 * @param {HTMLButtonElement} button              If the form was submitted via keyboard, this will be the default
 *                                                button, otherwise the button that was clicked.
 * @param {DialogV2} dialog                       The DialogV2 instance.
 * @returns {Promise<any>}
 */

/**
 * @typedef DialogV2Button
 * @property {string} action                      The button action identifier.
 * @property {string} label                       The button label. Will be localized.
 * @property {string} [icon]                      FontAwesome icon classes.
 * @property {string} [class]                     CSS classes to apply to the button.
 * @property {Record<string, string>} [style]     CSS style to apply to the button.
 * @property {string} [type="submit"]             The button type.
 * @property {boolean} [disabled]                 Whether the button is disabled
 * @property {boolean} [default]                  Whether this button represents the default action to take if the user
 *                                                submits the form without pressing a button, i.e. with an Enter
 *                                                keypress.
 * @property {DialogV2ButtonCallback} [callback]  A function to invoke when the button is clicked. The value returned
 *                                                from this function will be used as the dialog's submitted value.
 *                                                Otherwise, the button's identifier is used.
 */

/**
 * @typedef SelectInputConfig
 * @property {FormSelectOption[]} options
 * @property {string[]} [groups]        An option to control the order and display of optgroup elements. The order of
 *                                      strings defines the displayed order of optgroup elements.
 *                                      A blank string may be used to define the position of ungrouped options.
 *                                      If not defined, the order of groups corresponds to the order of options.
 * @property {string} [blank]
 * @property {string} [valueAttr]       An alternative value key of the object passed to the options array
 * @property {string} [labelAttr]       An alternative label key of the object passed to the options array
 * @property {boolean} [localize=false] Localize value labels
 * @property {boolean} [sort=false]     Sort options alphabetically by label within groups
 * @property {"single"|"multi"|"checkboxes"} [type] Customize the type of select that is created
 */

/**
 * @typedef FUSelectDialogConfiguration
 * @property {String} selected
 * @property {String} message
 */

/**
 * @remarks Helper usage examples can also be found here: https://foundryvtt.wiki/en/development/api/helpers
 */
export default class FoundryUtils {
	/**
	 * @param {String} title
	 * @param content
	 * @returns {Promise<*>}
	 */
	static async input(title, content) {
		const result = await foundry.applications.api.DialogV2.input({
			window: { title: title },
			content: content,
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			rejectClose: false,
			ok: {
				label: 'FU.Confirm',
			},
		});
		return result;
	}

	/**
	 * @param {String} title
	 * @param {FormSelectOption[]} options
	 * @param {string} [selected] the default selected value
	 * @returns {Promise<String|null>} The single selected option
	 */
	static async selectOptionDialog(title, options, selected) {
		const selectInput = fields.createSelectInput({
			options: options,
			name: 'option',
			type: 'checkboxes',
			value: selected,
		});

		const selectGroup = fields.createFormGroup({
			input: selectInput,
			label: 'Option',
		});

		const content = `${selectGroup.outerHTML}`;

		const data = await api.DialogV2.input({
			window: { title: title },
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: content,
		});
		return data?.option ?? null;
	}

	/**
	 * Show a dialog using radio buttons with optional icons.
	 *
	 * @param {String} title
	 * @param {{ value: string, label: string, icon?: string }[]} options
	 * @param {FUSelectDialogConfiguration} configuration
	 * @returns {Promise<String|null>}
	 */
	static async selectIconOptionDialog(title, options, configuration = {}) {
		const content = await FoundryUtils.renderTemplate('dialog/dialog-select-option-icon', {
			options: options,
			message: configuration.message,
		});

		// TODO: Set initial selected
		const data = await api.DialogV2.input({
			window: { title: title },
			actions: {
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				selectOption: (event, dialog) => {
					const value = event.target.dataset.value;
					const parent = dialog.closest('div');
					const option = parent.querySelector("input[name='option']");
					option.value = value;
					parent.querySelectorAll('button').forEach((button) => {
						button.classList.remove('selected');
					});
					dialog.classList.add('selected');
				},
			},
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: content,
		});

		return data?.option ?? null;
	}

	/**
	 * @remarks This follows the 'key:value' format used in the system's CONFIG file
	 * @param {string[]} keys
	 * @param {Record<string, string>} labelRecord
	 * @param {Record<string, string>} iconRecord
	 * @returns {FormSelectOption[]}
	 */
	static generateConfigIconOptions(keys, labelRecord, iconRecord) {
		return Array.from(keys).map((key) => ({
			label: StringUtils.localize(labelRecord[key]),
			icon: iconRecord[key],
			value: key,
		}));
	}

	/**
	 * @param {Object} typeObject
	 * @returns {FormSelectOption[]}
	 * @remarks This follows the 'key:value' format used in the system's CONFIG file
	 */
	static generateConfigOptions(typeObject) {
		const options = Object.entries(typeObject).map(([key, value]) => ({
			label: StringUtils.localize(value),
			value: key,
		}));
		return options;
	}

	/**
	 * @param obj1
	 * @param obj2
	 * @returns {boolean} If they have the same keys
	 */
	static haveSameKeys(obj1, obj2) {
		const keys1 = Object.keys(obj1).sort();
		const keys2 = Object.keys(obj2).sort();
		return JSON.stringify(keys1) === JSON.stringify(keys2);
	}

	/**
	 * @param {String} templatePath The path relative to the system's templates directory
	 * @param {Object} context Used by the template
	 * @returns {Promise<*>}
	 */
	static async renderTemplate(templatePath, context) {
		return await handlebars.renderTemplate(systemTemplatePath(templatePath), context);
	}

	/**
	 * @typedef LabelFunction
	 * @template T
	 * @param {T} object
	 * @returns String
	 */

	/**
	 * @template T
	 * @param {string} title - Dialog title
	 * @param {T[]} options - Array of elements to choose from
	 * @param {LabelFunction<T>} getLabel
	 * @returns {Promise<string|null>} - Selected string or null if cancelled
	 */
	static async promptRadioChoice(title, options, getLabel) {
		const context = {
			choices: await Promise.all(
				options.map(async (opt) => {
					const label = getLabel(opt);
					const enrichedLabel = await TextEditor.enrichHTML(label);
					return {
						label: enrichedLabel,
						element: opt,
					};
				}),
			),
		};
		const content = await handlebars.renderTemplate(systemTemplatePath('dialog/dialog-selection-radio'), context);
		const { index } = await api.DialogV2.input({
			window: { title: title },
			label: game.i18n.localize('FU.Submit'),
			rejectClose: false,
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content: content,
			ok: {
				label: 'FU.Confirm',
			},
		});

		if (index) {
			return options[index];
		} else {
			return null;
		}
	}

	/**
	 * @param {String} title
	 * @param {String[]} options
	 * @returns {Promise<string|null>}
	 */
	static async promptStringRadioChoice(title, options) {
		return this.promptRadioChoice(title, options, (opt) => opt);
	}

	/**
	 * @param {Object} options
	 * @param {string} options.title
	 * @param {string} options.content
	 * @param {DialogV2Button[]} options.buttons
	 * @returns {Promise<string|null>}
	 */
	static async promptActionChoice({ title, content, buttons }) {
		const result = await foundry.applications.api.DialogV2.wait({
			window: {
				title,
				icon: null,
			},
			position: {
				width: 500,
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle', 'fu-dialog'],
			content,
			buttons,
		});
		return result ?? null;
	}

	/**
	 * @param {String} title
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {DialogV2Button[]} buttons
	 * @param {String} description
	 * @param {String} message
	 * @returns {Promise<string|null>}
	 */
	static async promptItemChoice({ title, actor, item, buttons, description, message }) {
		if (description) {
			description = await FoundryUtils.enrichText(description, {
				relativeTo: actor,
			});
		}
		const content = await this.renderTemplate('dialog/dialog-item-prompt', {
			item: item,
			description: description,
			message: message,
		});
		const action = await FoundryUtils.promptActionChoice({ title, content, buttons });
		return action ?? null;
	}

	/**
	 *
	 * @param {String} title
	 * @param {String} message
	 * @returns {Promise<Boolean>}
	 */
	static async confirmDialog(title, message) {
		return foundry.applications.api.DialogV2.confirm({
			window: {
				title: title,
			},
			classes: ['projectfu', 'sheet', 'backgroundstyle'],
			content: await this.renderTemplate('dialog/dialog-common', {
				message: message,
			}),
			rejectClose: false,
			yes: {
				label: 'FU.Confirm',
			},
			no: {
				label: 'FU.Cancel',
			},
		});
	}

	/**
	 * @param {Record<String, String>} record
	 * @param {((key: string, value: string) => string)} labelSelector
	 * @returns {{label: *, value: *}[]}
	 * @remarks Maps the localized values (by convention) as the labels, and the keys as the values.
	 */
	static getFormOptions(record, labelSelector = undefined) {
		return Object.entries(record).map(([key, value]) => ({
			label: StringUtils.localize(labelSelector ? labelSelector(key, value) : value),
			value: key,
		}));
	}

	/**
	 * @param {String} text
	 * @param {Object} context
	 * @returns {Promise<string>}
	 */
	static async enrichText(text, context) {
		return TextEditor.implementation.enrichHTML(text, context);
	}

	/**
	 * @param {String} str
	 * @return {Boolean}
	 */
	static isUUID(str) {
		if (typeof str === 'string') {
			return /^[A-Za-z]+\.[A-Za-z0-9]+(\.[A-Za-z]+\.[A-Za-z0-9]+)*$/.test(str);
		}
		return false;
	}
}
