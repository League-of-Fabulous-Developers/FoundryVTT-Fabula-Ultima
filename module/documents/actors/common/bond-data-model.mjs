import { FU } from '../../../helpers/config.mjs';

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
			admInf: new StringField({ initial: '', blank: true, choices: FU.bonds.admInf }),
			loyMis: new StringField({ initial: '', blank: true, choices: FU.bonds.loyMis }),
			affHat: new StringField({ initial: '', blank: true, choices: FU.bonds.affHat }),
			bonus: new NumberField({ nullable: true }),
		};
	}

	static migrateData(source, options) {
		for (const key of ['admInf', 'loyMis', 'affHat']) {
			if (source[key]) {
				source[key] = source[key].toLowerCase();
			}
		}
		return source;
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
	 * @param {FUBondEmotion} bond
	 */
	matches(bond) {
		if (bond === 'any' || bond === '') {
			return true;
		}
		switch (bond) {
			case 'admiration':
			case 'inferiority':
				return this.admInf === bond;
			case 'loyalty':
			case 'mistrust':
				return this.loyMis === bond;
			case 'affection':
			case 'hatred':
				return this.affHat === bond;
			default:
				return false;
		}
	}
}
