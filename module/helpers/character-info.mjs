/**
 * @description Contains information about a target in a combat event
 * @typedef CharacterInfo
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
 * @returns {CharacterInfo|null}
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
 * @param {FUActor[]} actors
 * @returns {CharacterInfo[]}
 */
function fromActors(actors) {
	return actors.map(fromActor);
}

/**
 * @param {FUCombatant[]} combatants
 * @returns {CharacterInfo[]}
 */
function fromCombatants(combatants) {
	return combatants.map((c) => {
		/** @type {CharacterInfo} */
		return {
			actor: c.actor,
			token: c.token,
			combatant: c,
			disposition: resolveDisposition(c.actor, c.token),
		};
	});
}

/**
 * @param {FUCombatant} combatant
 * @returns {CharacterInfo}
 */
function fromCombatant(combatant) {
	/** @type {CharacterInfo} */
	return {
		actor: combatant.actor,
		token: combatant.token,
		combatant: combatant,
		disposition: resolveDisposition(combatant.actor, combatant.token),
	};
}

/**
 * @param {TargetData[]} targets
 * @returns {CharacterInfo[]}
 */
function fromTargetData(targets) {
	return targets.map((t) => {
		const actor = fromUuidSync(t.uuid);
		const token = actor.resolveToken();
		const disposition = resolveDisposition(actor, token);
		/** @type {CharacterInfo} */
		return {
			actor: actor,
			token: token,
			data: t,
			disposition: disposition,
		};
	});
}

export const CharacterInfo = Object.freeze({
	fromTargetData,
	fromActor,
	fromActors,
	fromCombatant,
	fromCombatants,
});
