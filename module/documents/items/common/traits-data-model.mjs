import { FU } from '../../../helpers/config.mjs';

/**
 * @description Used when rolls are performed.
 * @property {Set<String>} values
 * @property {FUPredicateQuantifier} quantifier
 */
export class TraitsDataModel extends foundry.abstract.DataModel {
	/**
	 * @param {Object} data
	 */
	constructor(data = {}) {
		super(data);
	}

	static defineSchema() {
		const { SetField, StringField } = foundry.data.fields;
		return {
			values: new SetField(new StringField()),
			quantifier: new StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
		};
	}

	/**
	 * @param {Iterable<String>} traits
	 */
	evaluate(traits) {
		if (this.values.length === 0) {
			return true;
		}
		switch (this.quantifier) {
			case 'any':
				for (const t of traits) {
					if (this.values.has(t)) {
						return true;
					}
				}
				return false;

			case 'all':
				for (const t of traits) {
					if (!this.values.has(t)) {
						return false;
					}
				}
				return false;

			case 'none':
				for (const t of traits) {
					if (this.values.has(t)) {
						return false;
					}
				}
				return true;
		}
		return false;
	}
}
