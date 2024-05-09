import { ClassFeatureRegistry } from '../documents/items/classFeature/class-feature-registry.mjs';
import { OptionalFeatureRegistry } from '../documents/items/optionalFeature/optional-feature-registry.mjs';

export const FU = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */
FU.attributes = {
	dex: 'FU.AttributeDex',
	ins: 'FU.AttributeIns',
	mig: 'FU.AttributeMig',
	wlp: 'FU.AttributeWlp',
};

FU.attributeAbbreviations = {
	dex: 'FU.AttributeDexAbbr',
	ins: 'FU.AttributeInsAbbr',
	mig: 'FU.AttributeMigAbbr',
	wlp: 'FU.AttributeWlpAbbr',
};

FU.currencies = {
	zenit: {
	  label: "FU.Zenit",
	  abbreviation: "FU.ZenitAbbr",
	  conversion: 1
	}
  };


/**
 * @typedef {"untyped", "physical","air","bolt","dark","earth","fire","ice","light","poison"} DamageType
 */
/**
 * @type {Object<DamageType, string>}
 */
FU.damageTypes = {
	physical: 'FU.DamagePhysical',
	air: 'FU.DamageAir',
	bolt: 'FU.DamageBolt',
	dark: 'FU.DamageDark',
	earth: 'FU.DamageEarth',
	fire: 'FU.DamageFire',
	ice: 'FU.DamageIce',
	light: 'FU.DamageLight',
	poison: 'FU.DamagePoison',
	untyped: 'FU.DamageNone',
};

FU.affIcon = {
	physical: 'fun fu-phys',
	air: 'fun fu-wind',
	bolt: 'fun fu-bolt',
	dark: 'fun fu-dark',
	earth: 'fun fu-earth',
	fire: 'fun fu-fire',
	ice: 'fun fu-ice',
	light: 'fun fu-light',
	poison: 'fun fu-poison',
};

FU.allIcon = {
	offensive: 'is-offensive',
	martial: 'is-martial',
	melee: "is-melee",
	range: 'is-range',
	spell: 'is-spell',
	skill: 'is-skill',
	twoweapon: 'is-two-weapon',
	header: 'is-header',
	diamond: 'is-diamond',
	club: 'is-club',
	heart: 'is-heart',
	spade: 'is-spade',
	physical: 'fun fu-phys',
	air: 'fun fu-wind',
	bolt: 'fun fu-bolt',
	dark: 'fun fu-dark',
	earth: 'fun fu-earth',
	fire: 'fun fu-fire',
	ice: 'fun fu-ice',
	light: 'fun fu-light',
	poison: 'fun fu-poison',
};

FU.affType = {
	'-1': 'FU.AffinityVulnerable',
	0: 'FU.AffinityNormal',
	1: 'FU.AffinityResistance',
	2: 'FU.AffinityImmune',
	3: 'FU.AffinityAbsorption',
	4: 'FU.AffinityRepulsion',
};

FU.affTypeAbbr = {
	'-1': 'FU.AffinityVulnerableAbbr',
	0: 'FU.AffinityNormalAbbr',
	1: 'FU.AffinityResistanceAbbr',
	2: 'FU.AffinityImmuneAbbr',
	3: 'FU.AffinityAbsorptionAbbr',
	4: 'FU.AffinityRepulsionAbbr',
};

FU.affValue = {
	vulnerability: -1,
	none: 0,
	resistance: 1,
	immunity: 2,
	absorption: 3,
	repulsion: 4,
};

FU.species = ['beast', 'construct', 'demon', 'elemental', 'humanoid', 'monster', 'plant', 'undead', 'custom'];

FU.villainTypes = ['minor', 'major', 'supreme'];

FU.speciesRule = {
	beast: 'FU.BeastRule',
	construct: 'FU.ConstructRule',
	demon: 'FU.DemonRule',
	elemental: 'FU.ElementalRule',
	humanoid: 'FU.HumanoidRule',
	monster: 'FU.MonsterRule',
	plant: 'FU.PlantRule',
	undead: 'FU.UndeadRule',
	custom: 'FU.CustomRule',
};

FU.itemTypes = {
	basic: 'TYPES.Item.basic',
	weapon: 'TYPES.Item.weapon',
	shield: 'TYPES.Item.shield',
	armor: 'TYPES.Item.armor',
	accessory: 'TYPES.Item.accessory',
	consumable: 'TYPES.Item.consumable',
	treasure: 'TYPES.Item.treasure',
	class: 'TYPES.Item.class',
	classFeature: 'TYPES.Item.classFeature',
	optionalFeature: 'TYPES.Item.optionalFeature',
	skill: 'TYPES.Item.skill',
	heroic: 'TYPES.Item.heroic',
	spell: 'TYPES.Item.spell',
	miscAbility: 'TYPES.Item.miscAbility',
	rule: 'TYPES.Item.rule',
	behavior: 'TYPES.Item.behavior',
	ritual: 'TYPES.Item.ritual',
	project: 'TYPES.Item.project',
	zeroPower: 'TYPES.Item.zeroPower',
};

FU.actionTypes = {
	attack: 'FU.Attack',
	equipment: 'FU.Equipment',
	guard: 'FU.Guard',
	hinder: 'FU.Hinder',
	inventory: 'FU.Inventory',
	objective: 'FU.Objective',
	spell: 'FU.Spell',
	study: 'FU.Study',
	skill: 'FU.Skill',
};

FU.actionRule = {
	attack: 'FU.AttackRule',
	equipment: 'FU.EquipmentRule',
	guard: 'FU.GuardRule',
	hinder: 'FU.HinderRule',
	inventory: 'FU.InventoryRule',
	objective: 'FU.ObjectiveRule',
	spell: 'FU.SpellRule',
	study: 'FU.StudyRule',
	skill: 'FU.SkillRule',
};

FU.statusEffects = {
	crisis: 'FU.Crisis',
	cover: 'FU.Cover',
	guard: 'FU.Guard',
	slow: 'FU.Slow',
	dazed: 'FU.Dazed',
	weak: 'FU.Weak',
	shaken: 'FU.Shaken',
	enraged: 'FU.Enraged',
	poisoned: 'FU.Poisoned',
	'wlp-down': 'FU.WLPDown',
	'wlp-up': 'FU.WLPUp',
	'dex-down': 'FU.DEXDown',
	'dex-up': 'FU.DEXUp',
	'ins-up': 'FU.INSUp',
	'ins-down': 'FU.INSDown',
	'mig-up': 'FU.MIGUp',
	'mig-down': 'FU.MIGDown',
};

FU.statusEffectRule = {
	crisis: 'FU.CrisisRule',
	cover: 'FU.CoverRule',
	guard: 'FU.GuardRule',
	slow: 'FU.SlowRule',
	dazed: 'FU.DazedRule',
	weak: 'FU.WeakRule',
	shaken: 'FU.ShakenRule',
	enraged: 'FU.EnragedRule',
	poisoned: 'FU.PoisonedRule',
	'wlp-down': 'FU.WLPDownRule',
	'wlp-up': 'FU.WLPUpRule',
	'dex-down': 'FU.DEXDownRule',
	'dex-up': 'FU.DEXUpRule',
	'ins-down': 'FU.INSDownRule',
	'ins-up': 'FU.INSUpRule',
	'mig-down': 'FU.MIGDownRule',
	'mig-up': 'FU.MIGUpRule',
};

/**
 * @typedef {"arcane", "bow", "brawling", "dagger", "firearm", "flail", "heavy", "spear", "sword", "thrown", "custom"} WeaponCategory
 */
/**
 * @type {Object.<WeaponCategory, string>}
 */
FU.weaponCategories = {
	arcane: 'FU.Arcane',
	bow: 'FU.Bow',
	brawling: 'FU.Brawling',
	dagger: 'FU.Dagger',
	firearm: 'FU.Firearm',
	flail: 'FU.Flail',
	heavy: 'FU.Heavy',
	spear: 'FU.Spear',
	sword: 'FU.Sword',
	thrown: 'FU.Thrown',
	custom: 'FU.Custom',
};

/**
 * @typedef {"custom", "arcana", "deck", "dance", "gift", "magiseed", "invention", "invocation", "therioform", "symbol", "infusion", "quirk", "other"} MiscCategory
 */
/**
 * @type {Object.<MiscCategory, string>}
 */
FU.miscCategories = {
	other: 'FU.Other',
	quirk: 'FU.Quirk',
};

/**
 * @typedef {"arcane", "bow", "brawling", "dagger", "firearm", "flail", "heavy", "spear", "sword", "thrown"} weaponCategoriesWithoutCustom
 */
/**
 * @type {Object.<weaponCategoriesWithoutCustom, string>}
 */
FU.weaponCategoriesWithoutCustom = {
	arcane: 'FU.Arcane',
	bow: 'FU.Bow',
	brawling: 'FU.Brawling',
	dagger: 'FU.Dagger',
	firearm: 'FU.Firearm',
	flail: 'FU.Flail',
	heavy: 'FU.Heavy',
	spear: 'FU.Spear',
	sword: 'FU.Sword',
	thrown: 'FU.Thrown',
};

/**
 * @typedef {"skill", "style"} HeroicType
 */
/**
 * @type {Object.<HeroicType, string>}
 */
FU.heroicType = {
	skill: 'FU.Heroic',
	style: 'FU.HeroicStyle',
};

/**
 * @typedef {"potion", "utility"} ConsumableType
 */
/**
 * @type {Object.<ConsumableType, string>}
 */
FU.consumableType = {
	potion: 'FU.Potion',
	utility: 'FU.Utility',
};

/**
 * @typedef {"treasure", "material", "artifact"} TreasureType
 */
/**
 * @type {Object.<TreasureType, string>}
 */
FU.treasureType = {
	treasure: 'FU.Treasure',
	material: 'FU.Material',
	artifact: 'FU.Artifact',
};

/**
 * @typedef {"melee", "ranged"} WeaponType
 */
/**
 * @type {Object.<WeaponType, string>}
 */
FU.weaponTypes = {
	melee: 'FU.Melee',
	ranged: 'FU.Ranged',
};

/**
 * @typedef {"def", "mdef"} Defense
 */
/**
 * @type {Object.<Defense, Object.<"name"|"abbr", string>>}
 */
FU.defenses = {
	def: {
		name: 'FU.Defense',
		abbr: 'FU.DefenseAbbr',
	},
	mdef: {
		name: 'FU.MagicDefense',
		abbr: 'FU.MagicDefenseAbbr',
	},
};

/**
 * @typedef {"one-handed", "two-handed"} Handedness
 */
/**
 * @type {Object.<Handedness, string>}
 */
FU.handedness = {
	'one-handed': 'FU.OneHanded',
	'two-handed': 'FU.TwoHanded',
};

FU.classFeatureRegistry = new ClassFeatureRegistry();
FU.optionalFeatureRegistry = new OptionalFeatureRegistry();

FU.resources = {
	hp: 'FU.HealthPoints',
	mp: 'FU.MindPoints',
	ip: 'FU.InventoryPoints',
};

FU.resourcesAbbr = {
	hp: 'FU.HealthAbbr',
	mp: 'FU.MindAbbr',
	ip: 'FU.InventoryAbbr',
};

FU.resourceIcons = {
	hp: 'fas fa-heart',
	mp: 'fas fa-hat-wizard',
	ip: 'ra ra-gear-hammer',
};
