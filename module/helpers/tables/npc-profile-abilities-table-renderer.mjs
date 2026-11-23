import { AbilitiesTableRenderer } from './abilities-table-renderer.mjs';

export class NpcProfileAbilitiesTableRenderer extends AbilitiesTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-abilities-table',
		hideIfEmpty: true,
		columns: {
			combinedProgress: foundry.data.operators.ForcedDeletion.create(),
			controls: foundry.data.operators.ForcedDeletion.create(),
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
