import { FU } from '../../../../helpers/config.mjs';

function migrateKeyData(source) {
	if ('recovery' in source) {
		source.resource = source.recovery;
		delete source.recovery;
	}
}

function migrateKeyDamageType(source) {
	if ('type' in source && source.type in FU.damageTypes) {
		source.damageType = source.type;
		delete source.type;
	}
}

export class KeyMigrations {
	static run(source) {
		migrateKeyData(source);
		migrateKeyDamageType(source);
	}
}
