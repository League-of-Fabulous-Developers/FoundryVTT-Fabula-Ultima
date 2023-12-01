export const FU = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */
FU.attributes = {
	mig: 'FU.AttributeMig',
	dex: 'FU.AttributeDex',
	ins: 'FU.AttributeIns',
	wlp: 'FU.AttributeWlp',
};

FU.attributeAbbreviations = {
	mig: 'FU.AttributeMigAbbr',
	dex: 'FU.AttributeDexAbbr',
	ins: 'FU.AttributeInsAbbr',
	wlp: 'FU.AttributeWlpAbbr',
};

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

FU.speciesRule = {
	beast: 'FU.BeastRule',
	construct: 'FU.ConstructRule',
	demon: 'FU.DemonRule',
	elemental: 'FU.ElementalRule',
	humanoid: 'FU.HumanoidRule',
	monster: 'FU.MonsterRule',
	plant: 'FU.PlantRule',
	undead: 'FU.UndeadRule',
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
