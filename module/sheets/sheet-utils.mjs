import { TextEditor } from '../helpers/text-editor.mjs';

/**
 * @description Provides utility functions for rendering sheets
 */
export const SheetUtils = Object.freeze({
	/**
	 * @param sheet
	 * @param {String} path
	 * @returns {Promise<{description: *}>}
	 */
	prepareEnrichedTextEditor: async (sheet, path) => {
		const _options = {
			secrets: sheet.isEditable,
			documents: true,
			links: true,
			embeds: true,
			rolls: true,
			rollData: sheet.document.getRollData(),
		};
		const textProperty = foundry.utils.getProperty(sheet.document, path);
		const description = await TextEditor.enrichHTML(textProperty, _options);
		return {
			description: description,
		};
	},
});
