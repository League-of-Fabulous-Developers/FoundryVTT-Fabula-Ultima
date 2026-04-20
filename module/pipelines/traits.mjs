import { StringUtils } from '../helpers/string-utils.mjs';
// NOTE: This should not have no further dependencies!

/**
 * @description A list of common traits.
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const ActionTraits = Object.freeze({
	Damage: 'damage',
	Restore: 'restore',
	Gain: 'gain',
	Loss: 'loss',
	HitPoint: 'hit-point',
	MindPoint: 'mind-point',
});

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
	...ActionTraits,
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
	IgnoreVulnerable: 'ignore-vulnerable',
	IgnoreAffinities: 'ignore-affinities',
	AbsorbHalf: 'absorb-half',
	Absorb: 'absorb',
	MindPointLoss: 'mind-point-loss',
	HitPointAbsorption: 'hit-point-absorption',
	MindPointAbsorption: 'mind-point-absorption',
	NonLethal: 'non-lethal',
	HighRollZero: 'high-roll-zero',
	Base: 'base',
});

/**
 * @desc Some skills provide certain features that are hard to quantify otherwise.
 * @type {Readonly<{}>}
 */
export const SkillTraits = Object.freeze({
	GrantSpell: 'grant-spell',
});

/**
 * @desc Some heroic skills provide certain features that are hard to quantify otherwise.
 * @type {Readonly<{}>}
 */
export const HeroicSkillTraits = Object.freeze({
	GrantExtraSpells: 'grant-extra-spells',
});

/**
 * @description A list of traits in use for certain skills or class features.
 * @remarks Automatically converted to kebab case.
 */
export const FeatureTraits = Object.freeze({
	OverChannel: 'over-channel',
	Gift: 'gift',
	Verse: 'verse',
	Dance: 'dance',
	ArcanumSummon: 'arcanum-summon',
	ArcanumDismiss: 'arcanum-dismiss',
	ArcanumPulse: 'arcanum-pulse',
	Invocation: 'invocation',
	InvocationHex: 'invocation-hex',
	InvocationBlast: 'invocation-blast',
});

/**
 * @description Al traits supported by the system
 * @remarks Automatically converted to kebab case.
 * @remarks These are generally used by items and inline actions.
 */
export const Traits = Object.freeze({
	...ConsumableTraits,
	...FeatureTraits,
	...DamageTraits,
});

export const TraitUtils = Object.freeze({
	/**
	 * @param{String} trait
	 * @returns {string}
	 */
	normalize(trait) {
		return `FU.${StringUtils.kebabToPascal(trait)}`;
	},

	/**
	 * @param {String} trait
	 */
	localize(trait) {
		return StringUtils.localize(this.normalize(trait));
	},

	/**
	 * @param {String} trait
	 * @returns {Tag}
	 */
	toTag(trait) {
		return {
			tag: this.normalize(trait),
			separator: '',
			value: '',
			show: true,
		};
	},

	/**
	 * @param {Iterable<String>} traits
	 * @param {Boolean} prefix
	 * @returns {{tag: string, separator: string, value: string, show: boolean}[]}
	 */
	toTags(traits, prefix = true) {
		return [...traits].map((trait) => ({
			tag: StringUtils.localize(prefix ? `FU.${trait}` : trait),
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
		return Object.entries(traits).map(([key, value]) => ({
			label: key,
			value: value,
		}));
	},

	/**
	 * @param {Record<String, String>} traits
	 * @returns {{key: *, value: *}[]}
	 * @remarks To be used with specific records.
	 */
	getOptionsFromConfig(traits) {
		return Object.entries(traits).map(([key, value]) => ({
			label: StringUtils.localize(value),
			value: key,
		}));
	},
});
