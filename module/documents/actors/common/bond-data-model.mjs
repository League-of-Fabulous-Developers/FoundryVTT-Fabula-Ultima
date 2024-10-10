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

	get strength() {
		const emotions = [this.admInf, this.loyMis, this.affHat].filter(Boolean).length;
		if (emotions) {
			return emotions + (this.parent?.bonuses.bondStrength ?? 0);
		} else {
			return 0;
		}
	}
}
