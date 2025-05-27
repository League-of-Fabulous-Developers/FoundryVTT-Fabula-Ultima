// TODO: Decide whether to define in config.mjs.

/**
 * @description A non-comprehensive list of traits supported by the damage, resource, and effects pipelines.
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const Traits = Object.freeze({
	IgnoreResistances: 'ignore-resistances',
	IgnoreImmunities: 'ignore-immunities',
	AbsorbHalf: 'absorb-half',
	Absorb: 'absorb',
	MindPointLoss: 'mind-point-loss',
	MindPointAbsorption: 'mind-point-absorption',
	NonLethal: 'non-lethal',
	Base: 'base',
});
