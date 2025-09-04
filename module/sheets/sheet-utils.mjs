import { TextEditor } from '../helpers/text-editor.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';

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
		let description = textProperty;
		try {
			description = await TextEditor.enrichHTML(textProperty, _options);
		} catch (err) {
			ui.notifications.error(`Failed to enrich the text: ${StringUtils.truncate(description, 15)}. Please check it.`, { localize: true });
		}
		return {
			description: description,
		};
	},
});
