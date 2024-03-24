export class NpcSkillTracker {
	/**
	 * @type NpcDataModel
	 */
	#data;

	/**
	 * @param {NpcDataModel} data
	 */
	constructor(data) {
		this.#data = data;
	}

	get availableSkills() {
		return {
			species: this.#calcAvailableSkillsFromSpecies(),
			level: Math.floor(this.#data.level.value / 10),
			vulnerabilities: this.#calcAvailableSkillsFromVulnerabilities(),
			rank: this.#calcAvailableSkillsFromRank(),
		};
	}

	get spAvailable() {
		return Object.values(this.availableSkills).reduce((total, value) => total + value, 0);
	}

	get usedSkills() {
		const absorption = this.#calcUsedSkillsFromAbsorbs();
		const [immunities, remainingFromAbsorb] = this.#calcUsedSkillsFromImmunities(absorption);
		return {
			specialAttacks: this.#calcUsedSpecialAttacks(),
			spells: this.#calcUsedSkillsFromSpells(),
			extraDefense: this.#calcUsedSkillsFromExtraDefs(),
			extraHP: this.#calcUsedSkillsFromExtraHP(),
			extraMP: this.#calcUsedSkillsFromExtraMP(),
			initiativeBonus: this.#calcUsedSkillsFromExtraInit(),
			accuracyCheck: this.#calcUsedSkillsFromExtraPrecision(),
			magicCheck: this.#calcUsedSkillsFromExtraMagic(),
			absorption: absorption,
			immunities: immunities,
			resistances: this.#calcUsedSkillsFromResistances(remainingFromAbsorb),
			specialRules: this.#calcUsedSkillsFromSpecial(),
			otherActions: this.#calcUsedSkillsFromOtherActions(),
			equipment: this.#calcUsedSkillsFromEquipment(),
		};
	}

	get spUsed() {
		return Object.values(this.usedSkills).reduce((total, value) => total + value, 0);
	}

	#calcAvailableSkillsFromSpecies() {
		let number = 4;
		const species = this.#data.species.value;
		if (species === 'demon' || species === 'plant' || species === 'humanoid') {
			number = 3;
		}
		if (species === 'construct' || species === 'elemental' || species === 'undead') {
			number = 2;
		}
		return number;
	}

	#calcAvailableSkillsFromRank() {
		if (this.#data.isChampion.value > 1) {
			return this.#data.isChampion.value;
		} else if (this.#data.isElite.value) {
			return 1;
		} else {
			return 0;
		}
	}

	#calcAvailableSkillsFromVulnerabilities() {
		let sum = 0;

		Object.entries(this.#data.affinities).forEach(([affinity, value]) => {
			if (value.base === -1) {
				if (affinity === 'physical') {
					// If physical vulnerable, add 2
					sum += 2;
				} else {
					// If vulnerable (except 'physical'), add 1
					sum += 1;
				}
			}
		});

		// Undead are vulnerable to light
		const species = this.#data.species.value;
		if (species === 'undead' && this.#data.affinities.light.base === -1) {
			sum -= 1;
		}

		// Plants have an innate vulnerability
		if (species === 'plant') {
			const innateVulnerabilities = ['fire', 'air', 'ice', 'bolt'];
			for (const affinity of innateVulnerabilities) {
				if (this.#data.affinities[affinity].base === CONFIG.FU.affValue.vulnerability) {
					sum -= 1;
					break;
				}
			}
		}

		// Ensure the sum is non-negative
		sum = Math.max(0, sum);

		return sum;
	}

	#calcUsedSpecialAttacks() {
		let sum = 0;

		this.#data.actor.items.forEach((item) => {
			// Check if the item has a system and a quality property before accessing it
			const hasSystem = item.system && item.system.quality;
			// Check if the quality value is defined and has a length property
			const hasQuality = hasSystem && item.system.quality.value && item.system.quality.value.length > 0;
			if (hasQuality) {
				sum++;
			}
		});
		return sum;
	}

	#calcUsedSkillsFromSpells() {
		return this.#data.actor.itemTypes.spell.length / 2;
	}

	#calcUsedSkillsFromExtraDefs() {
		const { def, mdef } = this.#data.derived;
		return Math.floor((def.bonus + mdef.bonus) / 3);
	}

	#calcUsedSkillsFromExtraHP() {
		return this.#data.resources.hp.bonus / 10;
	}

	#calcUsedSkillsFromExtraMP() {
		return this.#data.resources.mp.bonus / 20;
	}

	#calcUsedSkillsFromExtraInit() {
		return this.#data.derived.init.bonus ? 1 : 0;
	}

	#calcUsedSkillsFromExtraPrecision() {
		return Math.floor(this.#data.bonuses.accuracy.accuracyCheck / 3);
	}

	#calcUsedSkillsFromExtraMagic() {
		return Math.floor(this.#data.bonuses.accuracy.magicCheck / 3);
	}

	#calcUsedSkillsFromResistances(fromAbsorb) {
		let sum = fromAbsorb * 0.5;

		const species = this.#data.species.value;
		Object.entries(this.#data.affinities).forEach(([affinity, value]) => {
			if (value.base === 1) {
				if (affinity === 'earth' && species === 'construct') {
					// constructs are innately resistant to earth
				} else {
					sum += 0.5;
				}
			}
		});
		// Demons have two free resistances
		if (species === 'demon') {
			sum -= 1;
		}

		sum = Math.max(0, sum);

		return sum;
	}

	#calcUsedSkillsFromImmunities(fromAbsorb) {
		let sum = 0;
		let species = this.#data.species.value;
		Object.entries(this.#data.affinities).forEach(([affinity, value]) => {
			if (value.base === 2) {
				// Don't count poison for construct, elemental, undead
				if (affinity === 'poison' && ['construct', 'elemental', 'undead'].includes(species)) {
					return;
				}

				// Don't count dark for undead
				if (affinity === 'dark' && species === 'undead') {
					return;
				}
				sum++;
			}
		});

		// Elementals have a free immunity
		if (species === 'elemental') {
			sum = sum - 1;
		}

		if (sum < 0) {
			return [0, Math.max(0, fromAbsorb + sum)];
		}
		return [sum, fromAbsorb];
	}

	#calcUsedSkillsFromAbsorbs() {
		let sum = 0;
		Object.entries(this.#data.affinities).forEach((el) => {
			if (el[1].base === 3) {
				sum++;
			}
		});
		return sum;
	}

	#calcUsedSkillsFromOtherActions() {
		return this.#data.actor.itemTypes.miscAbility.length;
	}

	#calcUsedSkillsFromSpecial() {
		return this.#data.actor.itemTypes.rule.length;
	}

	#calcUsedSkillsFromEquipment() {
		const equipmentTypes = ['weapon', 'shield', 'armor'];
		const sum = equipmentTypes.reduce((total, type) => total + this.#data.actor.itemTypes[type].length, 0);

		return sum > 0 ? 1 : 0;
	}
}
