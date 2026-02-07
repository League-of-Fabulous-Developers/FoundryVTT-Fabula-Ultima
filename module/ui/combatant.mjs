import { FRIENDLY, HOSTILE } from './combat.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { PressureSystem } from '../systems/pressure-system.mjs';

Hooks.on('preCreateCombatant', function (document, data, options, userId) {
	if (!(document instanceof FUCombatant)) {
		return false;
	}
	if (document.actorId == null || document.actor == null) {
		ui.notifications.info('FU.CombatTokenWithoutActor', { localize: true });
		return false;
	}
	if (!document.actor.isCharacterType) {
		ui.notifications.info('FU.CombatTokenInvalidActor', { localize: true });
		return false;
	}
	return true;
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
 * @property {Object} token
 * @inheritDoc
 */
export class FUCombatant extends foundry.documents.Combatant {
	/**
	 * @override
	 */
	async _onCreate(createData, options, userId) {
		if (userId !== game.user.id) return;
		if (this.actor.type === 'npc') {
			if (game.settings.get(SYSTEM, SETTINGS.optionAutomaticAdversaryRegistration)) {
				const party = await FUPartySheet.getActiveModel();
				if (party) {
					await party.addOrUpdateAdversary(this.actor, 0);
				}
			}
			if (game.settings.get(SYSTEM, SETTINGS.pressureSystem)) {
				await PressureSystem.applyPressureEffect(this.actor);
			}
		}
	}

	/**
	 * @param {Object} options Additional options which modify the deletion request
	 * @param {BaseUser} user The User requesting the document deletion
	 * @returns {Promise<Boolean|void>} A return value of false indicates the deletion operation should be cancelled.
	 * @private
	 */
	async _preDelete(options, user) {
		if (this.actor.type === 'npc') {
			if (game.settings.get(SYSTEM, SETTINGS.pressureSystem)) {
				await PressureSystem.removePressureEffect(this.actor);
			}
		}
		return super._preDelete(options, user);
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
