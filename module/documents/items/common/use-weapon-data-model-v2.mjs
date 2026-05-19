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

	static migrateData(source) {
		source = super.migrateData(source);
		migrateWeapon(source);
		return source;
	}
}

function migrateWeapon(source) {
	if (typeof source.accuracy === 'object' && 'value' in source.accuracy) {
		source.accuracy = source.accuracy.value ?? false;
	}
	if (typeof source.damage === 'object' && 'value' in source.damage) {
		source.damage = source.damage.value ?? false;
	}
	if (typeof source.traits === 'object' && 'value' in source.traits) {
		source.traits = source.traits.value ?? true;
	}
}
