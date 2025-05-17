const { api, sheets } = foundry.applications;

export class FUActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'actor', 'backgroundstyle'],
		scrollY: ['.sheet-body'],
	};
}
