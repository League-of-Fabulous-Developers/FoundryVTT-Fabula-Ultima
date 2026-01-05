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

	/**
	 * @returns {boolean}
	 */
	get empty() {
		return this.entries.length === 0;
	}

	/**
	 * @returns {String[]}
	 * @remarks Not to be used in pipelines. Use {@link values}
	 */
	get keys() {
		return Array.from(this.entries.values());
	}

	/**
	 * @returns {String[]}
	 * @remarks What will actually be used for pipelines that use traits.
	 */
	get values() {
		return Array.from(this.entries, (entry) => Traits[entry]);
	}

	/**
	 * @param {String} element
	 * @returns {boolean}
	 */
	has(element) {
		return this.entries.has(element);
	}
}
