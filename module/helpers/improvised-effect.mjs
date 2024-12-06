import { FU } from './config.mjs';

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
 * @param {*} dataset
 * @param {FUActor} source
 * @param {FUActor[]} targets
 * @returns The amount as an integer, null otherwise
 */
function calculateAmountFromContext(dataset, source, targets) {
	const effect = dataset.effect;
	if (effect === undefined) {
		return Number(dataset.amount);
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

/**
 * @param {HTMLAnchorElement}} anchor The root html element for this inline command
 * @param {*} amount An integer for the value OR an improvised effect label (minor,heavy,massive)
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
};
