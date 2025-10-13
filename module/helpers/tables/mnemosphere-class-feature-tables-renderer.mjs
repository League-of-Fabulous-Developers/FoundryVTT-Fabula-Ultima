import { FeaturesTableRenderer, FeatureTables } from './feature-tables-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

export class MnemosphereClassFeatureTables extends FeatureTables {
	constructor() {
		super('classFeature', MnemosphereClassFeaturesTableRenderer);
	}
}

class MnemosphereClassFeaturesTableRenderer extends FeaturesTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		getItems: MnemosphereClassFeaturesTableRenderer.#getItems,
		columns: {
			controls: CommonColumns.itemControlsColumn(
				{ custom: MnemosphereClassFeaturesTableRenderer._renderControlsHeader },
				{
					hideDelete: false,
					disableDelete: MnemosphereClassFeaturesTableRenderer.#isSheetLocked,
					hideMenu: true,
					hideFavorite: true,
				},
			),
		},
	};

	#sheetLocked;

	static #getItems(mnemosphere) {
		return mnemosphere.system.classFeatures.filter((item) => item.system.featureType === this.featureKey);
	}

	static #isSheetLocked() {
		return this.#sheetLocked;
	}

	async renderTable(document, options = {}) {
		this.#sheetLocked = options.sheetLocked;
		const result = await super.renderTable(document, options);
		this.#sheetLocked = undefined;
		return result;
	}
}
