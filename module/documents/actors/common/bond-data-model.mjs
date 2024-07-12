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
			strength: new NumberField({ initial: 0, min: 0, max: 4, integer: true, nullable: false }),
		};
	}
}
