/**
 * @desc Tracks skill levels for the character based on owned Items.
 */
export class CharacterSkillTracker {
	/**
	 * @type CharacterDataModel
	 */
	#characterData;

	/**
	 * @type {Record<String, Number>}
	 **/
	#classSkills;

	/**
	 * @param {CharacterDataModel} data
	 */
	constructor(data) {
		this.#characterData = data;

		/** @type FUActor **/
		const actor = data.parent;

		// Count the number of skills in the actor
		const skills = actor.getItemsByType('skill');
		let _classSkills = {};
		for (const skill of skills) {
			/** @type SkillDataModel **/
			const skillData = skill.system;
			if (_classSkills[skillData.class.value] === undefined) {
				_classSkills[skillData.class.value] = skillData.level.value;
			} else {
				_classSkills[skillData.class.value] += skillData.level.value;
			}
		}
		this.#classSkills = _classSkills;
	}

	/**
	 * @param {FUItem} classItem
	 * @returns {Number|number}
	 */
	getClassLevel(classItem) {
		const fuid = classItem.system?.fuid;
		if (fuid && this.#classSkills[fuid]) {
			return this.#classSkills[fuid];
		}
		return 0;
	}

	/**
	 * @returns {{value, max: number}}
	 */
	get totalSkill() {
		return {
			value: this.#calculateSkillLevel(this.#characterData.actor.itemTypes.skill),
			max: this.#characterData.level.value,
		};
	}

	/**
	 * @returns {{value: number, max: number}}
	 */
	get totalHeroic() {
		return {
			value: this.#characterData.actor.itemTypes.heroic.filter((item) => item.parent === this.#characterData.actor).filter((item) => item.system.subtype.value === 'skill').length,
			max: Object.values(this.#classSkills).filter((count) => count >= 10).length,
		};
	}

	#calculateSkillLevel(items) {
		return items.filter((item) => item.parent === this.#characterData.actor).reduce((sum, item) => sum + item.system.level.value, 0);
	}
}
