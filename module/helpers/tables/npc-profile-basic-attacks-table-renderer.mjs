import { BasicAttacksTableRenderer } from './basic-attacks-table-renderer.mjs';

export class NpcProfileBasicAttacksTableRenderer extends BasicAttacksTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-basic-attacks-table',
		columns: {
			'-=controls': null,
		},
	};
}
