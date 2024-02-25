/**
 * @type {TextEditorEnricherConfig}
 */
export const handlebarsHtmlEnricher = {
	pattern: /\{\{(.*?)}}/g,
	enricher: enricher,
};

function enricher(text, options) {
	console.log(text, options);

	return Handlebars.compile(text[0])(options.rollData);
}
