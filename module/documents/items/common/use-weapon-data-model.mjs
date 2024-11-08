/**
 * @property {boolean} accuracy.value
 * @property {boolean} damage.value
 * @property {boolean} hrZero.value
 */
export class UseWeaponDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { SchemaField, BooleanField } = foundry.data.fields;
		return {
			accuracy: new SchemaField({ value: new BooleanField() }),
			damage: new SchemaField({ value: new BooleanField() }),
			hrZero: new SchemaField({ value: new BooleanField() }),
		};
	}
}
