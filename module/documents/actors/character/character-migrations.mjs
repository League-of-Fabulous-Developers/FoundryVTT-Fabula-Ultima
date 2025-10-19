function migrateLegacyBonds(source) {
	if (source.resources && !('bonds' in source.resources)) {
		for (const bond of ['bond1', 'bond2', 'bond3', 'bond4', 'bond5', 'bond6']) {
			if (bond in source.resources) {
				const { name, admInf, loyMis, affHat } = source.resources[bond];

				if (name || admInf || loyMis || affHat) {
					const bonds = (source.bonds ??= []);
					bonds.push({
						name,
						admInf,
						loyMis,
						affHat,
					});
				}
				delete source.resources[bond];
			}
		}
	}
}

function migrateLegacyFabulaPoints(source) {
	if ('fp' in source && !('fp' in source.resources)) {
		const fp = (source.resources.fp ??= {});
		fp.value = source.fp.value ?? 0;
		delete source.fp;
	}
}

function migratePhysicalAffinity(source) {
	if (source.affinities && 'phys' in source.affinities && !('physical' in source.affinities)) {
		source.affinities.physical = source.affinities.phys;
	}
}

function migrateBonds(source) {
	if (source.resources && 'bonds' in source.resources && !('bonds' in source)) {
		source.bonds = source.resources.bonds;
	}
}

function migrateLocallyEmbeddedDocumentFieldToEmbeddedItemUuidField(source) {
	function migrate(id) {
		if (typeof id === 'string' && !id.includes('.')) {
			return `.Item.${id}`;
		} else {
			return id;
		}
	}

	if (source.vehicle) {
		if ('vehicle' in source.vehicle) {
			source.vehicle.vehicle = migrate(source.vehicle.vehicle);
		}
		if ('armor' in source.vehicle) {
			source.vehicle.armor = migrate(source.vehicle.armor);
		}

		if (Array.isArray(source.vehicle.weapons)) {
			source.vehicle.weapons = source.vehicle.weapons.map((value) => migrate(value));
		}
		if (Array.isArray(source.vehicle.supports)) {
			source.vehicle.supports = source.vehicle.supports.map((value) => migrate(value));
		}
	}

	if (source.floralist) {
		if (source.floralist.garden) {
			source.floralist.garden = migrate(source.floralist.garden);
		}
		if (source.floralist.planted) {
			source.floralist.planted = migrate(source.floralist.planted);
		}
	}
}

export class CharacterMigrations {
	static run(source) {
		migrateLegacyBonds(source);

		migrateLegacyFabulaPoints(source);

		migratePhysicalAffinity(source);

		migrateBonds(source);

		migrateLocallyEmbeddedDocumentFieldToEmbeddedItemUuidField(source);
	}
}
