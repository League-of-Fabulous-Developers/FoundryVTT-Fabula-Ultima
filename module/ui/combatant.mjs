import { FRIENDLY, HOSTILE } from './combat.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';

Hooks.on('preCreateCombatant', function (document, data, options, userId) {
	if (document instanceof FUCombatant && document.actorId === null) {
		ui.notifications.info('FU.CombatTokenWithoutActor', { localize: true });
		return false;
	}
});

export class FUCombatant extends Combatant {
	/**
	 * @return {"friendly" | "hostile"}
	 */
	get faction() {
		return this.token?.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY ? FRIENDLY : HOSTILE;
	}

	/**
	 * @return number
	 */
	get totalTurns() {
		if (this.token?.actor && this.token.actor.system instanceof NpcDataModel) {
			if (this.token.actor.system.isElite.value) {
				return 2;
			}
			if (this.token.actor.system.isChampion.value) {
				return this.token.actor.system.isChampion.value;
			}
		}
		return 1;
	}
}
