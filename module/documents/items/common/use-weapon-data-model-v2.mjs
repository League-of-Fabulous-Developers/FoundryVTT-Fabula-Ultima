/**
 * @property {boolean} accuracy
 * @property {boolean} damage
 */
export class UseWeaponDataModelV2 extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField } = foundry.data.fields;
		return {
			accuracy: new BooleanField(),
			damage: new BooleanField(),
		};
	}
}
