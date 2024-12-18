import { FU } from './config.mjs';

/**
 * @param {number} level The level of the character
 * @returns The character tier (0,1,2)
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
 * The scalar amount of each improvised effect
 * ordered by the character tier  / level range [5-19, 20-39, 40+ ]
 */
const amountPerLevelRange = [
	// Minor (0)
	[10, 30, 40],
	// Heavy (1)
	[20, 40, 60],
	// Massive (2)
	[30, 50, 80],
];

/**
 * @typedef {"minor", "heavy", "massive "} ImprovisedEffectType
 */

/**
 * @param {Number} level The character level
 * @param {ImprovisedEffectType} effect The improvised effect type
 * @returns {Number}
 */
function calculateAmount(level, effect) {
	const tier = getCharacterTier(level);
	const index = effectIndex[effect];
	return amountPerLevelRange[tier][index];
}

/**
 * Calculates the improvised amount for a given effect
 * @param {ImprovisedEffectType} effect
 * @param {ExpressionContext} context
 * @returns {Number} The amount as an integer, null otherwise
 */
function calculateAmountFromContext(effect, context) {
	if (effect === undefined) {
		return null;
	}

	let level = 5;
	if (context.actor !== undefined) {
		level = context.actor.system.level.value;
		console.debug(`Used the source actor to calculate level`);
	} else {
		if (context.targets.length > 0) {
			console.debug(`Used the target actors to calculate level`);
			level = context.targets.reduce((max, target) => {
				return Math.max(max, target.system.level.value);
			}, -Infinity);
		} else {
			console.warn(`No actor was given to determine level, thus used the default (5).`);
		}
	}

	return calculateAmount(level, effect);
}

/**
 * @param {HTMLAnchorElement} anchor The root html element for this inline command
 * @param {Number|ImprovisedEffectType} amount An integer for the value OR an improvised effect label (minor,heavy,massive)
 * @returns {boolean} True if the amount was appended
 */
function appendAmountToAnchor(anchor, amount) {
	if (amount in FU.improvisedEffect) {
		anchor.append(`${game.i18n.localize(FU.improvisedEffect[amount])}`);
		anchor.dataset.effect = amount;
		return true;
	} else {
		const amountNumber = Number(amount);
		if (!Number.isNaN(amount)) {
			anchor.dataset.amount = amountNumber;
			anchor.append(`${amount} `);
			return true;
		}
	}

	return false;
}

export const ImprovisedEffect = {
	Minor: 'minor',
	Heavy: 'heavy',
	Massive: 'massive',
	calculateAmount,
	calculateAmountFromContext,
	appendAmountToAnchor,
	getCharacterTier,
};
