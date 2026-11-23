import { FU } from '../../../../helpers/config.mjs';

function migrateWeaponType(source) {
	if ('type' in source && source.type in { ...FU.weaponTypes, shield: '' }) {
		source.weaponType = source.type;
		delete source.type;
	}
}

export class WeaponModuleMigrations {
	static run(source) {
		migrateWeaponType(source);
	}
}
