function migrateQualityToOpportunity(source) {
	if ('quality' in source && source.quality.value && !('opportunity' in source)) {
		source.opportunity = source.quality.value;
		delete source.quality;
	}
}

export class SpellMigrations {
	static run(source) {
		migrateQualityToOpportunity(source);
	}
}
