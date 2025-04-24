export class CharacterSkillTracker {
	/**
	 * @type CharacterDataModel
	 */
	#data;

	/**
	 * @param {CharacterDataModel} data
	 */
	constructor(data) {
		this.#data = data;
	}

	get totalClass() {
		return {
			value: this.#calculateSkillLevel(this.#data.actor.itemTypes.class),
			max: this.#data.level.value,
		};
	}

	get totalSkill() {
		return {
			value: this.#calculateSkillLevel(this.#data.actor.itemTypes.skill),
			max: this.#data.level.value,
		};
	}

	get totalHeroic() {
		return {
			value: this.#data.actor.itemTypes.heroic.filter((item) => item.parent === this.#data.actor).filter((item) => item.system.subtype.value === 'skill').length,
			max: this.#data.actor.itemTypes.class.filter((item) => item.system.level.value >= 10).length,
		};
	}

	#calculateSkillLevel(items) {
		return items.filter((item) => item.parent === this.#data.actor).reduce((sum, item) => sum + item.system.level.value, 0);
	}
}
