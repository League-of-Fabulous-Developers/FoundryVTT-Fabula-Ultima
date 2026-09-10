import { WeaponsTableRenderer } from './weapons-table-renderer.mjs';

export class NpcProfileWeaponsTableRenderer extends WeaponsTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'npc-profile-weapons-table',
		columns: {
			controls: foundry.data.operators.ForcedDeletion.create(),
			equipStatus: foundry.data.operators.ForcedDeletion.create(),
		},
	};
}
