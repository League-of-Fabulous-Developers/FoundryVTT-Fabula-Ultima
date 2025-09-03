/**
 * @description Contains information about a target in a combat event
 * @typedef EventCharacter
 * @property {Token} token
 * @property {FUActor} actor
 * @property {null|"friendly"|"hostile"} disposition
 * @property {FUCombatant|null} combatant If available, the combatant data
 * @property {TargetData|null} data
 */

const dispositions = {
	[-1]: 'hostile',
	[0]: 'neutral',
	[1]: 'friendly',
};

/**
 * @param {FUActor} actor
 * @param {TokenDocument} token
 * @returns {String|null}
 */
function resolveDisposition(actor, token) {
	const dispositionIndex = token?.disposition ?? actor?.prototypeToken.disposition;
	return dispositions[dispositionIndex] ?? null;
}

/**
 * @param {FUActor} actor
 * @returns {EventCharacter|null}
 */
function fromActor(actor) {
	if (!actor) return null;
	const token = actor.resolveToken();
	const disposition = resolveDisposition(actor, token);
	return {
		actor: actor,
		token: token,
		disposition: disposition,
	};
}

/**
 * @param {FUCombatant} combatant
 * @returns {EventCharacter}
 */
function fromCombatant(combatant) {
	/** @type {EventCharacter} */
	return {
		actor: combatant.actor,
		token: combatant.token,
		combatant: combatant,
		disposition: resolveDisposition(combatant.actor, combatant.token),
	};
}

export const EventCharacters = Object.freeze({
	/**
	 * @param {TargetData[]} targets
	 * @returns {EventCharacter[]}
	 */
	fromTargetData(targets) {
		return targets.map((t) => {
			const actor = fromUuidSync(t.uuid);
			const token = actor.resolveToken();
			const disposition = resolveDisposition(actor, token);
			/** @type {EventCharacter} */
			return {
				actor: actor,
				token: token,
				data: t,
				disposition: disposition,
			};
		});
	},

	fromActor: fromActor,

	/**
	 * @param {FUActor[]} actors
	 * @returns {EventCharacter[]}
	 */
	fromActors(actors) {
		return actors.map(fromActor);
	},

	fromCombatant: fromCombatant,

	/**
	 * @param {FUCombatant[]} combatants
	 * @returns {EventCharacter[]}
	 */
	fromCombatants(combatants) {
		return combatants.map((c) => {
			/** @type {EventCharacter} */
			return {
				actor: c.actor,
				token: c.token,
				combatant: c,
				disposition: resolveDisposition(c.actor, c.token),
			};
		});
	},
});
