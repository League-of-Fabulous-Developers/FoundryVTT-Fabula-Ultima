export const CHECK_FLAVOR = Number.NaN;

export const CHECK_DETAILS = -2000;

export const CHECK_ROLL = -1000;

// TODO: Refactor the above too

/**
 * @desc Used for ordering the standardized chat message sections.
 * @type {Readonly<{tags: number}>}
 */
export const ChatSectionOrder = Object.freeze({
	flavor: Number.NaN,
	tags: -3000,
	details: -2000,
	reroll: -1100,
	roll: -1000,
	push: -1200,
	addendum: -900,
	result: 1000,
	actions: 2000,
});
