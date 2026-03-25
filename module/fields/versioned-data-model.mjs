import { systemId } from '../helpers/system-utils.mjs';

const fields = foundry.data.fields;

/**
 * Base class that adds versioning support to any DataModel.
 */
export class VersionedDataModel extends foundry.abstract.DataModel {
	static CURRENT_VERSION = 1; // Override in subclasses

	static defineSchema() {
		return {
			schemaVersion: new fields.NumberField({
				required: true,
				nullable: false,
				initial: this.CURRENT_VERSION,
				integer: true,
			}),
		};
	}

	/**
	 * Called by Foundry before validation. Perfect place to migrate.
	 */
	static migrateData(source) {
		source = super.migrateData(source);

		const version = source.schemaVersion ?? 0;
		if (version < this.CURRENT_VERSION) {
			source = this._runMigrations(source, version);
		}

		return source;
	}

	/**
	 * Run each migration step in sequence.
	 */
	static _runMigrations(source, fromVersion) {
		let data = foundry.utils.deepClone(source);

		for (let v = fromVersion; v < this.CURRENT_VERSION; v++) {
			const migrateFn = this.MIGRATIONS[v];
			if (migrateFn) {
				console.log(`[${systemId}] Migrating from v${v} → v${v + 1}`);
				data = migrateFn(data);
			}
			data.schemaVersion = v + 1;
		}

		return data;
	}

	/**
	 * Override in subclasses: { [fromVersion]: (source) => migratedSource }
	 */
	static MIGRATIONS = {};
}
