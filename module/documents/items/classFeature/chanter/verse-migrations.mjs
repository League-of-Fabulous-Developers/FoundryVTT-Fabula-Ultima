function migrateKeyData(source) {
	if ('recovery' in source) {
		source.resource = source.recovery;
		delete source.recovery;
	}
}

export class VerseMigrations {
	static run(source) {
		migrateKeyData(source);
	}
}
