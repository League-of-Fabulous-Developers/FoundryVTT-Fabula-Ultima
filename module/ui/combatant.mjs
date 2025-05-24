import { FRIENDLY, HOSTILE } from './combat.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';

Hooks.on('preCreateCombatant', function (document, data, options, userId) {
	if (document instanceof FUCombatant && document.actorId === null) {
		ui.notifications.info('FU.CombatTokenWithoutActor', { localize: true });
		return false;
	}
});

/**
 * @typedef Combatant
 * @property {Number} id
 * @property {Number} actorId
 * @property {Actor} actor
 * @property {TokenDocument} token
 * @property {Boolean} isNPC
 * @property {Boolean} visible
 * @property {Boolean} hidden
 * @property {Boolean} isDefeated
 * @remarks {@link https://foundryvtt.com/api/classes/client.Combatant.html}
 */

/**
 * @extends Combatant
 * @property {FUActor} actor
 * @inheritDoc
 */
export class FUCombatant extends Combatant {
	/**
	 * @override
	 */
	async _onCreate(createData, options, userId) {
		if (userId !== game.user.id) return;
		if (this.actor.type === 'npc') {
			const party = await FUPartySheet.getActiveModel();
			if (party) {
				await party.addOrUpdateAdversary(this.actor, 0);
			}
		}
	}

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
		let result = 0;
		if (this.token?.actor) {
			if (this.token.actor.system instanceof NpcDataModel) {
				result += this.token.actor.system.rank.replacedSoldiers;
			} else if (this.token.actor.system instanceof CharacterDataModel) {
				result += 1;
			}
			// Apply bonuses
			if (this.token.actor.system.bonuses.turns) {
				result += this.token.actor.system.bonuses.turns;
			}
		}
		return result;
	}
}
