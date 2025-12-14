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

	/**
	 * @returns {boolean}
	 */
	get empty() {
		return this.entries.length === 0;
	}

	/**
	 * @returns {SetIterator<String>}
	 */
	get selected() {
		return this.entries.values();
	}

	get values() {
		return this.entries.map((entry) => Traits[entry]);
	}

	/**
	 * @param {String} element
	 * @returns {boolean}
	 */
	has(element) {
		return this.entries.has(element);
	}
}
