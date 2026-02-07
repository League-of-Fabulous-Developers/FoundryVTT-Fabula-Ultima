function migrateLocallyEmbeddedDocumentFieldToEmbeddedItemUuidField(source) {
	function migrate(id) {
		if (typeof id === 'string' && !id.includes('.')) {
			return `.Item.${id}`;
		} else {
			return id;
		}
	}

	if ('key' in source) {
		source.key = migrate(source.key);
	}
	if ('tone' in source) {
		source.tone = migrate(source.tone);
	}
}

export class VerseMigrations {
	static run(source) {
		migrateLocallyEmbeddedDocumentFieldToEmbeddedItemUuidField(source);
	}
}
