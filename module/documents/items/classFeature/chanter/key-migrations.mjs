function migrateKeyData(source) {
	if ('recovery' in source) {
		source.resource = source.recovery;
		delete source.recovery;
	}
}

export class KeyMigrations {
	static run(source) {
		migrateKeyData(source);
	}
}
