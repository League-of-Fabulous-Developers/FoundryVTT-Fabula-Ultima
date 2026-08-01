import { SYSTEM } from '../../../../helpers/config.mjs';
import { Flags } from '../../../../helpers/flags.mjs';

function migrateEnablePulse(source) {
	if (foundry.utils.getProperty(source, Flags.migratedEnablePulse)) return;

	if (foundry.utils.hasProperty(source, 'system.data.pulse') && !foundry.utils.hasProperty(source, 'system.data.enablePulse')) {
		foundry.utils.setProperty(source, 'system.data.enablePulse', !!source.system.data.pulse);
		foundry.utils.setProperty(source, `flags.${SYSTEM}.${Flags.migratedEnablePulse}`, true);
	}
}

export class ArcanumMigrations {
	static run(source) {
		migrateEnablePulse(source);
	}
}
