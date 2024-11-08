function migrateLegacyHandedness(source) {
	if ('hands' in source) {
		source.hands.value = source.hands.value?.toLowerCase() ?? 'one-handed';
	}
}

function migrateLegacyWeaponType(source) {
	if ('type' in source) {
		source.type.value = source.type.value?.toLowerCase() ?? 'melee';
	}
}

export class WeaponMigrations {
	static run(source) {
		migrateLegacyHandedness(source);

		migrateLegacyWeaponType(source);
	}
}
