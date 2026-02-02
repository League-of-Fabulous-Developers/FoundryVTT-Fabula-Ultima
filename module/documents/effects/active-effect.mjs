import { FUActor } from '../actors/actor.mjs';
import { ActiveEffectBehaviourMixin } from './active-effect-behaviour-mixin.mjs';
import { CommonEvents } from '../../checks/common-events.mjs';

/**
 * @typedef ActiveEffect
 * @property {DataModel} parent
 * @property {Boolean} isSuppressed Is there some system logic that makes this active effect ineligible for application?
 * @property {Document} target Retrieve the Document that this ActiveEffect targets for modification.
 * @property {Boolean} active Whether the Active Effect currently applying its changes to the target.
 * @property {Boolean modifiesActor Does this Active Effect currently modify an Actor?
 * @property {Boolean} isTemporary Describe whether the ActiveEffect has a temporary duration based on combat turns or rounds.
 * @property {Boolean} isEmbedded Test whether this Document is embedded within a parent Document
 * @property {String} id Canonical name
 * @property {String} uuid
 * @property {String} name
 * @property {EffectDurationData} duration
 * @property {EffectChangeData[]} changes - The array of EffectChangeData objects which the ActiveEffect applies
 * @remarks https://foundryvtt.com/api/classes/client.ActiveEffect.html
 * @property {Function<Promise<Document>>} delete Delete this Document, removing it from the database.
 * @property {Function<void>} update Update this Document using incremental data, saving it to the database.
 * @property {Function<String, String, *, void>} setFlag Assign a "flag" to this document. Flags represent key-value type data which can be used to store flexible or arbitrary data required by either the core software, game systems, or user-created modules.
 * @property {Function<String, String, *>} getFlag Get the value of a "flag" for this document See the setFlag method for more details on flags
 */

/**
 * @typedef {EffectDurationData} ActiveEffectDuration
 * @property {string} type            The duration type, either "seconds", "turns", or "none"
 * @property {number|null} duration   The total effect duration, in seconds of world time or as a decimal
 *                                    number with the format {rounds}.{turns}
 * @property {number|null} remaining  The remaining effect duration, in seconds of world time or as a decimal
 *                                    number with the format {rounds}.{turns}
 * @property {string} label           A formatted string label that represents the remaining duration
 * @property {number} [_worldTime]    An internal flag used determine when to recompute seconds-based duration
 * @property {number} [_combatTime]   An internal flag used determine when to recompute turns-based duration
 */

/**
 * @extends ActiveEffect
 * @property {FUActiveEffectModel} system
 * @property {InlineSourceInfo} source
 * @property {Set<String>} statuses
 * @property {Boolean} disabled Serialized with the document.
 * @inheritDoc
 * */
export class FUActiveEffect extends ActiveEffectBehaviourMixin(ActiveEffect) {}

/**
 * @param {FUActor} actor
 * @param {EffectChangeData} change
 * @param current
 */
function onApplyActiveEffect(actor, change, current) {
	if (change.key.startsWith('system.') && current instanceof foundry.abstract.DataModel && Object.hasOwn(current, change.value) && current[change.value] instanceof Function) {
		console.debug(`Applying change ${change.value} to ${change.key}`);
		current[change.value]();
		return false;
	}
}
Hooks.on('applyActiveEffect', onApplyActiveEffect);

Hooks.on('preCreateActiveEffect', (effect, options, userId) => {
	const actor = effect.parent;
	if (!actor || !actor.system || !actor.system.immunities) return true;

	// Prevent creation on non-character actor types
	if (!actor.isCharacterType) {
		ui.notifications.error(`FU.ActorSheetEffectNotSupported`, { localize: true });
		return false;
	}

	// Check if the effect is a status effect
	const statusEffectId = CONFIG.statusEffects.find((e) => effect.statuses?.has(e.id))?.id;

	// Check for immunity using statusEffectId
	if (statusEffectId) {
		const immunityData = actor.system.immunities[statusEffectId];

		// If immune, block effect creation
		if (immunityData?.base) {
			const message = game.i18n.format('FU.ImmunityDescription', {
				status: statusEffectId,
			});

			ChatMessage.create({
				content: message,
				speaker: ChatMessage.getSpeaker({ actor: actor }),
			});

			return false; // Prevent the effect from being created
		}
	}

	return true; // Allow the effect to be created
});

Hooks.on('updateActiveEffect', (effect, changes, options, userId) => {
	if (game.userId === userId && effect.target instanceof FUActor && effect.target.canUserModify(game.user, 'update')) {
		if (effect.changes.some((change) => change.key.startsWith('system.resources.hp'))) {
			effect.target.applyCrisis();
		}
		if ('disabled' in changes) {
			CommonEvents.toggleEffect(effect.target, effect.uuid, !changes.disabled);
		}
	}
});
