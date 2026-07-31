import { FU, SYSTEM } from '../../helpers/config.mjs';
import { Flags } from '../../helpers/flags.mjs';

function migrateFavoriteStatusToFlag(source) {
	if (source.system && source.system.isFavored && source.system.isFavored.value) {
		source.flags ??= {};
		source.flags[SYSTEM] ??= {};

		if (!(Flags.Favorite in source.flags[SYSTEM])) {
			source.flags[SYSTEM][Flags.Favorite] = true;
		}

		delete source.system.isFavored;
	}
}

function migrate4xArcanum(source) {
	if (!source.system?.featureType === FU.classFeatures.arcanum) return;

	const flagPath = `flags.${SYSTEM}.migratedEnablePulse`;
	if (foundry.utils.getProperty(source, flagPath)) return;

	if (foundry.utils.hasProperty(source, 'system.data.pulse') && !foundry.utils.hasProperty(source, 'system.data.enablePulse')) {
		foundry.utils.setProperty(source, 'system.data.enablePulse', !!source.system.data.pulse);
		foundry.utils.setProperty(source, flagPath, true);
	}
}

export class ItemMigrations {
	static run(source) {
		migrateFavoriteStatusToFlag(source);
		migrate4xArcanum(source);
	}
}
