import { FUTableRenderer } from './table-renderer.mjs';
import { FU } from '../config.mjs';
import { CommonColumns } from './common-columns.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';

export class FeatureTables {
	#featureTables = {};

	/**
	 * @param {"classFeature", "optionalFeature"} featureType
	 * @param {typeof FUTableRenderer} [tableImplementation]
	 */
	constructor(featureType, tableImplementation = FeaturesTableRenderer) {
		const registries = {
			classFeature: FU.classFeatureRegistry,
			optionalFeature: FU.optionalFeatureRegistry,
		};
		const registry = registries[featureType];

		if (!registry) {
			throw new Error(`Unsupported feature type ${featureType}.`);
		}

		const compareTranslations = ([, v1], [, v2]) => {
			const t1 = game.i18n.localize(v1.translation);
			const t2 = game.i18n.localize(v2.translation);
			return t1.localeCompare(t2);
		};

		Object.entries(registry.qualifiedTypes)
			.sort(compareTranslations)
			.forEach(([key, feature]) => {
				this.#featureTables[key] = new tableImplementation(featureType, key, feature);
			});
	}

	async renderTable(document, options) {
		const tables = Object.fromEntries(Object.entries(this.#featureTables).map(([key, table]) => [key, table.renderTable(document, options)]));

		for (let key of Object.keys(tables)) {
			tables[key] = await tables[key];
		}

		return Object.values(tables)
			.filter((table) => !!table)
			.join('\n');
	}

	/**
	 * @param {foundry.applications.api.Application} application
	 */
	activateListeners(application) {
		Object.values(this.#featureTables).forEach((value) => value.activateListeners(application));
	}
}

export class FeaturesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'features-table',
		getItems: FeaturesTableRenderer.#getItems,
		renderDescription: CommonDescriptions.descriptionWithCustomEnrichment(FeaturesTableRenderer.#renderDescription),
		hideIfEmpty: true,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: FeaturesTableRenderer.#getNameColumnName, headerSpan: 2 }),
			inlay: {
				hideHeader: true,
				renderCell: FeaturesTableRenderer.#renderFeatureInlay,
			},
			controls: CommonColumns.itemControlsColumn({ custom: FeaturesTableRenderer._renderControlsHeader }),
		},
	};

	#itemType;
	#featureKey;
	#featureDataModel;

	/**
	 * @param {string} itemType
	 * @param {string} featureKey
	 * @param {FeatureDataModel} featureDataModel
	 */
	constructor(itemType, featureKey, featureDataModel) {
		super();
		this.#itemType = itemType;
		this.#featureKey = featureKey;
		this.#featureDataModel = featureDataModel;
	}

	get itemType() {
		return this.#itemType;
	}

	get featureKey() {
		return this.#featureKey;
	}

	get featureDataModel() {
		return this.#featureDataModel;
	}

	static #getItems(document) {
		return document.itemTypes[this.#itemType].filter((item) => item.system?.data instanceof this.#featureDataModel);
	}

	/**
	 * @typedef ItemNameColumnRenderOptions
	 * @property {number} [headerSpan]
	 * @property {(FUItem) => string|Promise<string>} [renderCaption]
	 * @property {string} [cssClass]
	 */

	/**
	 * @return {string}
	 */
	static #getNameColumnName() {
		return game.i18n.localize(this.#featureDataModel.translation);
	}

	/**
	 * @return {Promise<string>}
	 */
	static async _renderControlsHeader() {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/header/header-item-controls.hbs', {
			label: this.#featureDataModel.translation,
			type: this.#itemType,
			subtype: this.#featureKey,
		});
	}

	static async #renderFeatureInlay(item) {
		return foundry.applications.handlebars.renderTemplate(this.#featureDataModel.previewTemplate, { ...item, item: item, additionalData: await this.#featureDataModel.getAdditionalData(item.system.data) });
	}

	static async #renderDescription(item) {
		return foundry.applications.handlebars.renderTemplate(this.#featureDataModel.expandTemplate, { ...item, item: item, additionalData: await this.#featureDataModel.getAdditionalData(item.system.data) });
	}
}
