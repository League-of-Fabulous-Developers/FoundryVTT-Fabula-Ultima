/**
 * @description Represents a stash of items, which could be a loot pile or a merchant.
 * @property {String} description
 * @property {Boolean} merchant Whether this stash behaves like a merchant
 * @property {Number} resources.zenit.value
 */
export class StashDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { HTMLField, BooleanField, SchemaField, NumberField } = foundry.data.fields;
		return {
			description: new HTMLField(),
			merchant: new BooleanField(),
			resources: new SchemaField({
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			}),
		};
	}
}
