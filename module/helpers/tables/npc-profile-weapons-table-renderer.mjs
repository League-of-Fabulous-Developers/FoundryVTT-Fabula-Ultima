import { WeaponsTableRenderer } from './weapons-table-renderer.mjs';

export class NpcProfileWeaponsTableRenderer extends WeaponsTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-weapons-table',
		columns: {
			controls: new foundry.data.operators.ForcedDeletion(),
			equipStatus: new foundry.data.operators.ForcedDeletion(),
		},
	};
}
