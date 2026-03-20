/**
 * @property {string} name
 * @property {"Admiration", "Inferiority"} admInf
 * @property {"Loyalty", "Mistrust"} loyMis
 * @property {"Affection", "Hatred"} affHat
 * @property {number} strength
 */
export class BondDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, NumberField } = foundry.data.fields;
		return {
			name: new StringField({ initial: '' }),
			admInf: new StringField({ initial: '', blank: true, choices: ['Admiration', 'Inferiority'] }),
			loyMis: new StringField({ initial: '', blank: true, choices: ['Loyalty', 'Mistrust'] }),
			affHat: new StringField({ initial: '', blank: true, choices: ['Affection', 'Hatred'] }),
			bonus: new NumberField({ nullable: true }),
		};
	}

	/**
	 * @returns {Number}
	 */
	get strength() {
		const emotions = [this.admInf, this.loyMis, this.affHat].filter(Boolean).length;
		if (emotions) {
			const globalBonus = this.parent?.bonuses.bondStrength ?? 0;
			const localBonus = this.bonus ?? 0;
			return emotions + globalBonus + localBonus;
		} else {
			return 0;
		}
	}

	/**
	 * @param {FUBondPredicateKey} bond
	 */
	matches(bond) {
		if (bond === 'any') {
			return true;
		}
		switch (bond) {
			case 'admiration':
				if (this.admInf === 'Admiration') {
					return true;
				}
				break;
			case 'inferiority':
				if (this.admInf === 'Inferiority') {
					return true;
				}
				break;
			case 'loyalty':
				if (this.admInf === 'Loyalty') {
					return true;
				}
				break;
			case 'mistrust':
				if (this.admInf === 'Mistrust') {
					return true;
				}
				break;
			case 'affection':
				if (this.admInf === 'Affection') {
					return true;
				}
				break;
			case 'hatred':
				if (this.admInf === 'Hatred') {
					return true;
				}
				break;
		}
		return false;
	}
}
