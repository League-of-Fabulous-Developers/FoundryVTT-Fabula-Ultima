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
	 * @param {Iterable<String>} traits
	 */
	evaluate(traits) {
		// If no traits were set
		if (this.empty) {
			return true;
		}
		// If the traits were not defined but expected
		if (!traits) {
			return false;
		}

		switch (this.quantifier) {
			case 'any':
				for (const t of traits) {
					if (this.has(t)) {
						return true;
					}
				}
				return false;

			case 'all':
				for (const t of traits) {
					if (!this.has(t)) {
						return false;
					}
				}
				break;

			case 'none':
				for (const t of traits) {
					if (this.has(t)) {
						return false;
					}
				}
				break;
		}
		return true;
	}
}
