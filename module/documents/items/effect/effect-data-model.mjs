/**
 * @property {string} fuid
 * @property {string} summary.value
 */
export class EffectDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			cost: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
		};
	}
}
