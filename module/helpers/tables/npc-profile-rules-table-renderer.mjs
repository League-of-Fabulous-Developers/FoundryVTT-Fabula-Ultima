import { AbilitiesTableRenderer } from './abilities-table-renderer.mjs';

export class NpcProfileRulesTableRenderer extends AbilitiesTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-rules-table',
		hideIfEmpty: true,
		columns: {
			'-=clock': null,
			'-=controls': null,
		},
		getItems: NpcProfileRulesTableRenderer.#getItems,
	};

	constructor() {
		super('rule');
	}

	static #getItems(document, options) {
		options.revealed ??= {};
		return document.itemTypes.rule.filter((rule) => !!options.revealed[rule.id]);
	}
}
