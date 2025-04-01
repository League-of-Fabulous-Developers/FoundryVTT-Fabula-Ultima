// TODO: Decide whether to define in config.mjs. Though it's probably fine if they are all in english

/**
 * @description A non-comprehensive list of traits supported by the damage, resource, and effects pipelines.
 * @remarks These are generally used by items and inline actions.
 */
export const Traits = Object.freeze({
	// TODO: Use localized values?
	IgnoreResistances: 'ignore-resistance',
	IgnoreImmunities: 'ignore-immunity',
	AbsorbHalf: 'absorb-half',
	MentalDamage: 'mental-damage',
	NonLethal: 'non-lethal',
});
