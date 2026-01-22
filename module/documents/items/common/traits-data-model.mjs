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
		return this.entries.size === 0;
	}

	/**
	 * @returns {String[]}
	 * @remarks What will actually be used for pipelines that use traits.
	 */
	get values() {
		return Array.from(this.entries);
	}

	/**
	 * @param {String} trait
	 * @returns {boolean}
	 */
	has(trait) {
		return this.entries.has(trait);
	}
}
