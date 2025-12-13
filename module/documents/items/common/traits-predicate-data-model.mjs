import { FU } from '../../../helpers/config.mjs';
import { Traits } from '../../../pipelines/traits.mjs';

/**
 * @description Used when rolls are performed.
 * @property {Set<String>} entries
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
			entries: new SetField(new StringField()),
		};
	}

	static migrateData(source) {
		if (source.values) {
			source.entries = source.values;
			delete source.values;
		}
		return super.migrateData(source);
	}

	get empty() {
		return this.entries.length === 0;
	}

	get selected() {
		return this.entries.values();
	}

	get values() {
		return this.entries.map((entry) => Traits[entry]);
	}

	has(element) {
		return this.entries.has(element);
	}
}

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
		if (this.empty) {
			return true;
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
				return false;

			case 'none':
				for (const t of traits) {
					if (this.has(t)) {
						return false;
					}
				}
				return true;
		}
		return false;
	}
}
