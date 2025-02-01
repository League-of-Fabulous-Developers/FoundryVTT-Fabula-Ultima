export class RitualMigrations {
	static run(source) {
		if ('rollInfo' in source) {
			if (!('modifier' in source)) {
				if (source.rollInfo?.accuracy?.value) {
					source.modifier = source.rollInfo.accuracy.value;
				} else if (source.accuracy?.value) {
					source.modifier = source.accuracy?.value;
				}
				delete source.accuracy;
			}

			if (typeof source.attributes?.primary === 'object') {
				if (source.rollInfo?.attributes?.primary?.value) {
					(source.attributes ??= {}).primary = source.rollInfo.attributes.primary.value;
				} else {
					source.attributes.primary = source.attributes.primary.value;
				}
			}
			if (typeof source.attributes?.secondary === 'object') {
				if (source.rollInfo?.attributes?.secondary?.value) {
					(source.attributes ??= {}).secondary = source.rollInfo.attributes.secondary.value;
				} else {
					source.attributes.secondary = source.attributes.secondary.value;
				}
			}

			delete source.rollInfo;
		}
	}
}
