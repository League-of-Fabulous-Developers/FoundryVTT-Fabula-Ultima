function migrateEnablePulse(source) {
	if (!('enablePulse' in source) && source.pulse) source.enablePulse = true;
}

export class ArcanumMigrations {
	static run(source) {
		migrateEnablePulse(source);
	}
}
