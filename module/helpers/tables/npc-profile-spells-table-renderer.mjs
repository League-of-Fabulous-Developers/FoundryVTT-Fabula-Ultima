import { SpellsTableRenderer } from './spells-table-renderer.mjs';

export class NpcProfileSpellsTableRenderer extends SpellsTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-spells-table',
		columns: {
			'-=controls': null,
		},
	};
}
