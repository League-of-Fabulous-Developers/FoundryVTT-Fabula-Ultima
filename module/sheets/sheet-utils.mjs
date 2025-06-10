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
		const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(textProperty, _options);
		return {
			description: description,
		};
	},
});
