/**
 * @property {boolean} accuracy
 * @property {boolean} damage
 * @property {boolean} traits Whether to inherit weapon traits
 */
export class UseWeaponDataModelV2 extends foundry.abstract.DataModel {
	static defineSchema() {
		const { BooleanField } = foundry.data.fields;
		return {
			accuracy: new BooleanField(),
			damage: new BooleanField(),
			traits: new BooleanField({ initial: true }),
		};
	}
}
