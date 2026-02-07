import { SYSTEM } from '../../helpers/config.mjs';
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

export class ItemMigrations {
	static run(source) {
		migrateFavoriteStatusToFlag(source);
	}
}
