import { AbilitiesTableRenderer } from './abilities-table-renderer.mjs';

export class NpcProfileAbilitiesTableRenderer extends AbilitiesTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-abilities-table',
		hideIfEmpty: true,
		columns: {
			'-=combinedProgress': null,
			'-=controls': null,
		},
		getItems: NpcProfileAbilitiesTableRenderer.#getItems,
	};

	constructor() {
		super('miscAbility');
	}

	static #getItems(document, options) {
		options.revealed ??= {};
		return document.itemTypes.miscAbility.filter((ability) => !!options.revealed[ability.id]);
	}
}
