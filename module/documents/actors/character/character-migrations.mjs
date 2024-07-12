function migrateLegacyBonds(source) {
	if (source.resources) {
		for (const bond of ['bond1', 'bond2', 'bond3', 'bond4', 'bond5', 'bond6']) {
			if (bond in source.resources) {
				const { name, admInf, loyMis, affHat } = source.resources[bond];

				if (name || admInf || loyMis || affHat) {
					const bonds = (source.resources.bonds ??= []);
					bonds.push({
						name,
						admInf,
						loyMis,
						affHat,
						strength: [admInf, loyMis, affHat].reduce((prev, curr) => prev + (curr.length ? 1 : 0), 0),
					});
				}
				delete source.resources[bond];
			}
		}
	}
}

function migrateLegacyFabulaPoints(source) {
	if ('fp' in source) {
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

export class CharacterMigrations {
	static run(source) {
		migrateLegacyBonds(source);

		migrateLegacyFabulaPoints(source);

		migratePhysicalAffinity(source);
	}
}
