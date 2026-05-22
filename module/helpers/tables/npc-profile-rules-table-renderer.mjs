import { RulesTableRenderer } from './rules-table-renderer.mjs';

export class NpcProfileRulesTableRenderer extends RulesTableRenderer {
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

	static #getItems(document, options) {
		options.revealed ??= {};
		return document.itemTypes.rule.filter((rule) => !!options.revealed[rule.id]);
	}
}
