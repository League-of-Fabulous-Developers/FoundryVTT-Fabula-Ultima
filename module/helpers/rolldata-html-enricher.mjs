/**
 * @type {TextEditorEnricherConfig}
 */
export const rolldataHtmlEnricher = {
	pattern: /@DATA\[(.*?)]/g,
	enricher: enricher,
};

function enricher(text, options) {
	return String(foundry.utils.getProperty(options.rollData ?? {}, text[1].trim()) ?? text[0]);
}
