function migrateRollInfo(source) {
	if ('rollInfo' in source) {
		if (source.rollInfo.accuracy && 'value' in source.rollInfo.accuracy && typeof source.accuracy === 'object') {
			source.accuracy = source.rollInfo.accuracy.value ?? 0;
		}
		if (source.rollInfo.attributes?.primary?.value && typeof source.attributes.primary === 'object') {
			source.attributes.primary = source.rollInfo.attributes.primary.value ?? 'dex';
		}
		if (source.rollInfo.attributes?.secondary?.value && typeof source.attributes.secondary === 'object') {
			source.attributes.secondary = source.rollInfo.attributes.secondary.value ?? 'ins';
		}
		if (source.rollInfo.damage?.hasDamage?.value && typeof source.damage.hasDamage === 'object') {
			source.damage.hasDamage = source.rollInfo.damage.hasDamage.value ?? false;
			source.damage.value = source.rollInfo.damage.value ?? 0;
		}
		if (source.rollInfo.damage?.type.value && typeof source.damage.type === 'object') {
			source.damage.type = source.rollInfo.damage.type.value ?? '';
		} else if (typeof source.damage.type === 'object') {
			source.damage.type = source.damage.type.value;
		}
		if (source.rollInfo.useWeapon?.accuracy?.value && typeof source.useWeapon.accuracy === 'object') {
			source.useWeapon.accuracy = source.rollInfo.useWeapon.accuracy.value;
		}
		if (source.rollInfo.useWeapon?.damage?.value && typeof source.useWeapon.damage === 'object') {
			source.useWeapon.damage = source.rollInfo.useWeapon.damage.value;
		}
		if (source.rollInfo.useWeapon?.hrZero?.value && !('hrZero' in source.damage)) {
			source.damage.hrZero = source.rollInfo.useWeapon.hrZero.value;
		}
		delete source.rollInfo;
	}
}

export class SkillMigrations {
	static run(source) {
		migrateRollInfo(source);
	}
}
