import { CommonColumns } from './common-columns.mjs';
import { TradableTableRenderer } from './tradable-table-renderer.mjs';

const featureItemTypes = new Set(['classFeature', 'optionalFeature']);

export class OtherItemsTableRenderer extends TradableTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'other-items-table',
		getItems: OtherItemsTableRenderer.#getItems,
		renderDescription: () => '',
		hideIfEmpty: true,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Other' }),
			type: CommonColumns.textColumn({ columnLabel: 'FU.ItemType', getText: OtherItemsTableRenderer.#getItemTypeLabel, importance: 'high' }),
			controls: CommonColumns.itemControlsColumn({ custom: () => `<span>${game.i18n.localize('FU.Actions')}</span>` }, TradableTableRenderer.getCellOptions()),
		},
	};

	#excludedTypes = new Set();
	#excludedFeatureTypes = new Set();

	/**
	 * @typedef OtherItemsTableRendererOptions
	 * @property {string[]} excludedTypes
	 * @property {string[]} excludedFeatureTypes
	 */

	/**
	 * @param {string[] | OtherItemsTableRendererOptions} options
	 */
	constructor(options = {}) {
		super();
		if (Array.isArray(options)) {
			options.forEach((type) => this.#excludedTypes.add(type));
		} else {
			(options.excludedTypes ?? []).forEach((type) => this.#excludedTypes.add(type));
			(options.excludedFeatureTypes ?? []).forEach((type) => this.#excludedFeatureTypes.add(type));
		}
	}

	static #getItems(document, options) {
		const excludedTypes = new Set(this.#excludedTypes);
		const excludedFeatureTypes = new Set(this.#excludedFeatureTypes);

		(options.exclude ?? []).forEach((excludedType) => excludedTypes.add(excludedType));
		(options.include ?? []).forEach((excludedType) => excludedTypes.delete(excludedType));

		(options.excludeFeatures ?? []).forEach((excludedType) => excludedFeatureTypes.add(excludedType));
		(options.includeFeatures ?? []).forEach((excludedType) => excludedFeatureTypes.delete(excludedType));

		const items = [];
		for (let item of document.allItems()) {
			if (!excludedTypes.has(item.type)) {
				if (featureItemTypes.has(item.type)) {
					if (!excludedFeatureTypes.has(item.system.featureType)) {
						items.push(item);
					}
				} else {
					items.push(item);
				}
			}
		}
		return items;
	}

	static #getItemTypeLabel(item) {
		if (featureItemTypes.has(item.type)) {
			return item.system.data.constructor.translation;
		} else {
			return CONFIG.Item.typeLabels[item.type] ?? item.constructor.metadata.label;
		}
	}
}
