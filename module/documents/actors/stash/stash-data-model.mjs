/**
 * @description Represents a stash of items, which could be a loot pile or a merchant.
 * @property {String} description
 * @property {Boolean} merchant Whether this stash behaves like a merchant
 * @property {Number} rate The transaction modifier
 * @property {Number} resources.zenit.value
 */
export class StashDataModel extends foundry.abstract.TypeDataModel {
	/**
	 * @description The default cost to recharge IP per point
	 * @type {number}
	 */
	static defaultRecharge = 10;

	static defineSchema() {
		const { HTMLField, BooleanField, SchemaField, NumberField } = foundry.data.fields;
		return {
			description: new HTMLField(),
			merchant: new BooleanField(),
			rates: new SchemaField({
				recharge: new NumberField({ initial: this.defaultRecharge, min: 0, max: 50 }),
				item: new NumberField({ initial: 1, min: 0, step: 0.1, max: 2 }),
			}),
			resources: new SchemaField({
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			}),
		};
	}

	get itemRateString() {
		return `${Math.trunc(this.rates.item * 100)}%`;
	}
}
