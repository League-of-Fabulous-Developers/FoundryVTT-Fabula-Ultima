// TODO: Decide whether to define in config.mjs.

/**
 * @description A list of traits supported by the damage pipeline
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const DamageTraits = Object.freeze({
	IgnoreResistances: 'ignore-resistances',
	IgnoreImmunities: 'ignore-immunities',
	IgnoreAbsorption: 'ignore-absorption',
	AbsorbHalf: 'absorb-half',
	Absorb: 'absorb',
	MindPointLoss: 'mind-point-loss',
	MindPointAbsorption: 'mind-point-absorption',
	NonLethal: 'non-lethal',
	Base: 'base',
});

/**
 * @description Al traits supported by the system
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const Traits = Object.freeze({
	...DamageTraits,
});

export const TraitUtils = Object.freeze({
	/**
	 * @param {Set<String>} traits
	 * @returns {{tag: string, separator: string, value: string, show: boolean}[]}
	 */
	toTags(traits) {
		return [...traits].map((trait) => ({
			tag: `FU.${trait}`,
			separator: '',
			value: '',
			show: true,
		}));
	},
});
