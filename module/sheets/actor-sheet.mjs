const { api, sheets } = foundry.applications;

/**
 * @property {HTMLElement} element
 * @property {FUActor} actor
 */
export class FUActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'actor', 'projectfu-actor-sheet', 'sheet-content-wrapper', 'h-100', 'backgroundstyle'],
		scrollY: ['.sheet-body'],
		window: {
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
	};
}
