const affinityMapping = {
	VU: -1,
	NA: 0,
	RS: 1,
	IM: 2,
	AB: 3,
};

function migrateLegacyAffinities(source) {
	if ('resistances' in source && !('affinities' in source)) {
		const affinities = (source.affinities ??= {});

		for (let [key, value] of Object.entries(source.resistances)) {
			affinities[key] ??= {
				base: affinityMapping[value],
				current: 0,
				bonus: 0,
			};
		}
		delete source.resistances;
	}
}

function migrateOldAccuracyBonus(source) {
	if (source.derived && 'accuracy' in source.derived && !('accuracyCheck' in (source.bonuses?.accuracy ?? {}))) {
		const bonuses = (source.bonuses ??= {});
		const accuracy = (bonuses.accuracy ??= {});
		accuracy.accuracyCheck = source.derived.accuracy.bonus ?? 0;

		delete source.derived.accuracy;
	}
}

function migrateOldMagicBonus(source) {
	if (source.derived && 'magic' in source.derived && !('magicCheck' in (source.bonuses?.accuracy ?? {}))) {
		const bonuses = (source.bonuses ??= {});
		const accuracy = (bonuses.accuracy ??= {});
		accuracy.magicCheck = source.derived.magic.bonus ?? 0;

		delete source.derived.magic;
	}
}

function migrateOldMisspelledVillain(source) {
	if ('villian' in source && !('villain' in source)) {
		const villain = (source.villain ??= {});
		villain.value = source.villian.value ?? '';
	}
}

function migratePhysicalAffinity(source) {
	if (source.affinities && 'phys' in source.affinities && !('physical' in source.affinities)) {
		source.affinities.physical = source.affinities.phys;
	}
}

function migrateCreatureRanks(source) {
	if (!('rank' in source)) {
		source.rank = {
			value: 'soldier',
			replacedSoldiers: 1,
		};
		if (source.isCompanion?.value) {
			source.rank.value = 'companion';
			source.rank.replacedSoldiers = 0;
		}
		if (source.isElite?.value) {
			source.rank.value = 'elite';
			source.rank.replacedSoldiers = 2;
		}
		if (source.isChampion?.value > 1) {
			source.rank.value = 'champion';
			source.rank.replacedSoldiers = source.isChampion.value;
		}

		delete source.isCompanion;
		delete source.isElite;
		delete source.isChampion;
	}
}

export const NpcMigrations = {
	run: (source) => {
		migrateLegacyAffinities(source);

		migrateOldAccuracyBonus(source);

		migrateOldMagicBonus(source);

		migrateOldMisspelledVillain(source);

		migratePhysicalAffinity(source);

		migrateCreatureRanks(source);
	},
};
