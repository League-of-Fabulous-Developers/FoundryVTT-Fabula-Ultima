const affinityMapping = {
	VU: -1,
	NA: 0,
	RS: 1,
	IM: 2,
	AB: 3,
};

function migrateLegacyAffinities(source) {
	if ('resistances' in source) {
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
	if ('accuracy' in source.derived) {
		const bonuses = (source.bonuses ??= {});
		const accuracy = (bonuses.accuracy ??= {});
		accuracy.accuracyCheck = source.derived.accuracy.bonus ?? 0;

		delete source.derived.accuracy;
	}
}

function migrateOldMagicBonus(source) {
	if ('magic' in source.derived) {
		const bonuses = (source.bonuses ??= {});
		const accuracy = (bonuses.accuracy ??= {});
		accuracy.magicCheck = source.derived.magic.bonus ?? 0;

		delete source.derived.magic;
	}
}

function migrateOldMisspelledVillain(source) {
	if ('villian' in source) {
		const villain = (source.villain ??= {});
		villain.value = source.villian.value ?? '';
	}
}

export const NpcMigrations = {
	run: (source) => {
		migrateLegacyAffinities(source);

		migrateOldAccuracyBonus(source);

		migrateOldMagicBonus(source);

		migrateOldMisspelledVillain(source);
	},
};
