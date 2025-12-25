/**
 * @property {string} name
 * @property {"Admiration", "Inferiority"} admInf
 * @property {"Loyalty", "Mistrust"} loyMis
 * @property {"Affection", "Hatred"} affHat
 * @property {number} strength
 */
export class BondDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			name: new StringField({ initial: '' }),
			admInf: new StringField({ initial: '', blank: true, choices: ['Admiration', 'Inferiority'] }),
			loyMis: new StringField({ initial: '', blank: true, choices: ['Loyalty', 'Mistrust'] }),
			affHat: new StringField({ initial: '', blank: true, choices: ['Affection', 'Hatred'] }),
		};
	}

	/**
	 * @returns {Number}
	 */
	get strength() {
		const emotions = [this.admInf, this.loyMis, this.affHat].filter(Boolean).length;
		if (emotions) {
			return emotions + (this.parent?.bonuses.bondStrength ?? 0);
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
