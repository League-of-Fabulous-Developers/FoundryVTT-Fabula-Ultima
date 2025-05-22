const { api, sheets } = foundry.applications;

export class FUActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'actor', 'projectfu-actor-sheet', 'h-100', 'backgroundstyle'],
		scrollY: ['.sheet-body'],
		window: {
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
	};
}
