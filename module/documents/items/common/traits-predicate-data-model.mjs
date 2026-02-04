import { FU } from '../../../helpers/config.mjs';
import { TraitsDataModel } from './traits-data-model.mjs';

/**
 * @description Used when rolls are performed.
 * @property {FUPredicateQuantifier} quantifier
 * @property {Set<String>} values
 * @extends TraitsDataModel
 * @inheritDoc
 */
export class TraitsPredicateDataModel extends TraitsDataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			quantifier: new StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
		});
	}

	/**
	 * @param {Iterable<string>} traits
	 */
	evaluate(traits) {
		// No constraints → always valid
		if (this.empty) return true;

		// Constraints exist but nothing to evaluate against
		if (!traits) return false;

		const traitSet = new Set(traits);
		const values = this.values;

		switch (this.quantifier) {
			case 'any':
				return values.some((t) => traitSet.has(t));

			case 'all':
				return values.every((t) => traitSet.has(t));

			case 'none':
				return values.every((t) => !traitSet.has(t));

			default:
				return false;
		}
	}
}
