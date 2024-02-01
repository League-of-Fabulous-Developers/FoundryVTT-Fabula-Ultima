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

/**
 * @typedef {"phys","air","bolt","dark","earth","fire","ice","light","poison"} Affinity
 */
/**
 * @type {Object.<Affinity, string>}
 */
FU.affinities = {
	phys: 'FU.DamageNormal',
	air: 'FU.DamageWind',
	bolt: 'FU.DamageLightning',
	dark: 'FU.DamageDark',
	earth: 'FU.DamageEarth',
	fire: 'FU.DamageFire',
	ice: 'FU.DamageIce',
	light: 'FU.DamageLight',
	poison: 'FU.DamagePoison',
};

/**
 * @typedef {"physical","air","bolt","dark","earth","fire","ice","light","poison"} DamageType
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
};

FU.affIcon = {
	phys: 'fun fu-phys',
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
	'-1': 'FU.AffinityVulnurable',
	0: 'FU.AffinityNormal',
	1: 'FU.AffinityResistance',
	2: 'FU.AffinityImmune',
	3: 'FU.AffinityAbsorption',
	4: 'FU.AffinityRepulsion',
};

FU.affTypeAbbr = {
	'-1': 'FU.AffinityVulnurableAbbr',
	0: 'FU.AffinityNormalAbbr',
	1: 'FU.AffinityResistanceAbbr',
	2: 'FU.AffinityImmuneAbbr',
	3: 'FU.AffinityAbsorptionAbbr',
	4: 'FU.AffinityRepulsionAbbr',
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
	basic: 'FU.BasicAtack',
	weapon: 'FU.Weapon',
	shield: 'FU.Shield',
	armor: 'FU.Armor',
	accessory: 'FU.Accessory',
	consumable: 'FU.Consumable',
	treasure: 'FU.Treasure',
	class: 'FU.Class',
	skill: 'FU.Skill',
	heroic: 'FU.Heroic',
	miscAbility: 'FU.BeastRule',
	behavior: 'FU.ConstructRule',
	ritual: 'FU.DemonRule',
	project: 'FU.ElementalRule',
	zeroPower: 'FU.HumanoidRule',
};

FU.actionTypes = {
	attack: 'FU.Action',
	equipment: 'FU.Action',
	guard: 'FU.Action',
	hinder: 'FU.Action',
	inventory: 'FU.Action',
	objective: 'FU.Action',
	spell: 'FU.Action',
	study: 'FU.Action',
	skill: 'FU.Action',
	other: 'FU.Action',
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
