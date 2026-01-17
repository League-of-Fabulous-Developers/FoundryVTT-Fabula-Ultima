import { TextEditor } from '../helpers/text-editor.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { CompendiumBrowser } from '../ui/compendium/compendium-browser.mjs';

/**
 * @this
 * @param {PointerEvent} event   The originating click event
 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
 * @returns {Promise<void>}
 */
async function openCompendium(event, target) {
	const tab = target.dataset.tab;
	const text = target.dataset.text;
	return CompendiumBrowser.open(tab, {
		text: text,
	});
}

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

	/**
	 * @desc Common actions across sheets.
	 */
	actions: {
		openCompendium: openCompendium,
	},
});
