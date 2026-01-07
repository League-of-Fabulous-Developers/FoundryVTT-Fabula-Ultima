/**
 * @description Used when rolls are performed.
 * @property {Set<String>} entries
 */
export class EffectApplicationDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField, ArrayField } = foundry.data.fields;
		return {
			entries: new ArrayField(new StringField({ nullable: true })),
		};
	}
}
