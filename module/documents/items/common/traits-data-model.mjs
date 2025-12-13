import { FU } from '../../../helpers/config.mjs';

/**
 * @description Used when rolls are performed.
 * @property {Set<String>} values
 * @property {FUPredicateQuantifier} quantifier
 * @property {Record<String, String>} entries
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

	get options() {
		return this.schema.options?.options ?? {};
	}

	/**
	 * @returns {SetIterator<String>}
	 */
	get selected() {
		return this.values.values();
	}

	/**
	 * @returns {boolean}
	 */
	get assigned() {
		return this.values.length > 0;
	}
}
