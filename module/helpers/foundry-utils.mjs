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
 * @remarks Helper usage examples can also be found here: https://foundryvtt.wiki/en/development/api/helpers
 */
export default class FoundryUtils {
	/**
	 * @param {String} title
	 * @param {FormSelectOption[]} options
	 * @returns {Promise<String|null>} The single selected option
	 */
	static async selectOptionDialog(title, options) {
		const selectInput = fields.createSelectInput({
			options: options,
			name: 'option',
			type: 'checkboxes',
		});

		const selectGroup = fields.createFormGroup({
			input: selectInput,
			label: 'Option',
		});

		const content = `${selectGroup.outerHTML}`;

		const data = await api.DialogV2.input({
			window: { title: title },
			content: content,
		});
		return data?.option ?? null;
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
	static async promptChoice(title, options, getLabel) {
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
		const content = await handlebars.renderTemplate(systemTemplatePath('dialog/dialog-choose'), context);
		const { index } = await api.DialogV2.input({
			window: { title: title },
			label: game.i18n.localize('FU.Submit'),
			rejectClose: false,
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
	static async promptStringChoice(title, options) {
		return this.promptChoice(title, options, (opt) => opt);
	}
}
