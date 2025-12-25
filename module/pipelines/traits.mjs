// TODO: Decide whether to define in config.mjs.
// TODO: Add character traits, etc..

/**
 * @description A list of traits supported by items
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const ConsumableTraits = Object.freeze({
	Potion: 'potion',
	ElementalShard: 'elemental-shard',
	Magisphere: 'magisphere',
	Infusion: 'infusion',
	Damage: 'damage',
	Restore: 'restore',
});

/**
 * @description A list of traits supported by items
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const CharacterTraits = Object.freeze({
	Flying: 'flying',
});

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
 * @description A list of traits in use for certain skills.
 * @remarks Automatically converted to kebab case.
 */
export const SkillTraits = Object.freeze({
	OverChannel: 'over-channel',
});

/**
 * @description Al traits supported by the system
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const Traits = Object.freeze({
	...ConsumableTraits,
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

	/**
	 * @param {Record<String, String>} traits
	 * @returns {{label: *, value: *}[]}
	 */
	getOptions(traits) {
		return Object.keys(traits).map((key) => ({
			label: key,
			value: key,
		}));
	},
});
