export class ArmorMigrations {
	static run(source) {
		if (source.def && !('attribute' in source.def)) {
			source.def.attribute = source.attributes?.primary?.value;
			delete source.attributes?.primary;
		}

		if (source.mdef && !('attribute' in source.mdef)) {
			source.mdef.attribute = source.attributes?.secondary?.value;
			delete source.attributes?.secondary;
		}
		delete source.attributes;
		delete source.isBehaviour;
		delete source.weight;
		delete source.rollInfo;
	}
}
