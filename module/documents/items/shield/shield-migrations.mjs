function migrateCustomWeaponCategory(source) {
	if ('category' in source && 'value' in source.category && source.category.value === 'custom') {
		source.category.value = 'brawling';
	}
}

export class ShieldMigrations {
	static run(source) {
		migrateCustomWeaponCategory(source);
	}
}
