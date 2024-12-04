/**
 * @param {number} level The level of the character
 * @returns The character tier.
 */
function getCharacterTier(level) {
	if (level >= 40) {
		return 2;
	} else if (level >= 20) {
		return 1;
	}
	return 0;
}

/**
 * Effect : Array Index
 */
const effectIndex = {
	minor: 0,
	heavy: 1,
	massive: 2,
};

/**
 * Tier: Effect [Minor,Heavy,Massive]
 */
const amountPerTier = [
	[10, 30, 40],
	[20, 40, 60],
	[30, 50, 80],
];

/**
 * @typedef {"minor", "heavy", "massive "} ImprovisedEffectType
 */

/**
 * @param {Number} level The character level
 * @param {ImprovisedEffectType} effect The improvised effect type
 * @returns
 */
function calculateAmount(level, effect) {
	const tier = getCharacterTier(level);
	const index = effectIndex[effect];
	const amount = amountPerTier[tier][index];
	return amount;
}

/**
 * Calculates the improvised amount for a given effect
 * @param {ImprovisedEffectType} effect
 * @param {FUActor} source
 * @param {FUActor[]} targets
 * @returns The amount as an integer, null otherwise
 */
function calculateAmountFromContext(effect, source, targets) {
	if (effect === undefined) {
		return null;
	}

	let level = 5;
	if (source !== undefined) {
		level = source.system.level.value;
	} else {
		if (targets.length > 0) {
			level = targets.reduce((a, b) => b.system.level.value > a.system.level.value);
		} else {
			console.warn(`No actor was given to determine level, thus used the default (5).`);
		}
	}

	const amount = ImprovisedEffect.calculateAmount(level, effect);
	console.info(`Calculated amount for level ${level}, effect ${effect} = ${amount}`);
	return amount;
}

export const ImprovisedEffect = {
	Minor: 'minor',
	Heavy: 'heavy',
	Massive: 'massive',
	calculateAmount,
	calculateAmountFromContext,
};
