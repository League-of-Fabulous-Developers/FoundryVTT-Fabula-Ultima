import { StringUtils } from './string-utils.mjs';

const { api, fields } = foundry.applications;

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

export const FoundryUtils = Object.freeze({
	/**
	 * @param {String} title
	 * @param {FormSelectOption[]} options
	 * @returns {String} The single selected option
	 */
	selectOptionDialog: async (title, options) => {
		const selectInput = fields.createSelectInput({
			options: options,
			name: 'option',
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
		return data.option;
	},
	/**
	 *
	 * @param {Object} typeObject
	 * @returns {FormSelectOption[]}
	 * @remarks This follows the 'key:value' format used in the system's CONFIG file
	 */
	generateConfigOptions: (typeObject) => {
		const options = Object.entries(typeObject).map(([key, value]) => ({
			label: StringUtils.localize(value),
			value: key,
		}));
		return options;
	},
});
