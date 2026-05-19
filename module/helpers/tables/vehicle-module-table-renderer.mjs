import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { TradableTableRenderer } from './tradable-table-renderer.mjs';

/**
 * @desc To be used for non-character sheets, where different equipment types are all lumped together in a simplified way.
 */
export class VehicleModuleTableRenderer extends TradableTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'vehicle-modules-table',
		getItems: VehicleModuleTableRenderer.#getItems,
		renderDescription: VehicleModuleTableRenderer.#renderDescription,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.ClassFeatureVehicleModules', headerSpan: 2 }),
			details: {
				hideHeader: true,
				renderCell: VehicleModuleTableRenderer.#renderDetails,
			},
			cost: CommonColumns.textColumn({ columnLabel: 'FU.Cost', importance: 'high', getText: VehicleModuleTableRenderer.#getCost }),
			controls: CommonColumns.itemControlsColumn(
				{ headerAlignment: 'end', type: 'classFeature', subtype: () => [FU.classFeatures.armorModule, FU.classFeatures.weaponModule, FU.classFeatures.supportModule] },
				TradableTableRenderer.getCellOptions(),
			),
		},
	};

	/**
	 * Needs to be non-static so that it is only
	 * @type {Set<*>}
	 */
	#includedFeatureTypes = new Set([FU.classFeatures.armorModule, FU.classFeatures.weaponModule, FU.classFeatures.supportModule]);

	static #getItems(document) {
		return document.itemTypes.classFeature.filter((item) => this.#includedFeatureTypes.has(item.system.featureType));
	}

	static async #renderDescription(item) {
		const featureTypeClass = item.system.data.constructor;
		return foundry.applications.handlebars.renderTemplate(featureTypeClass.expandTemplate, { ...item, item: item, additionalData: await featureTypeClass.getAdditionalData(item.system.data) });
	}

	static async #renderDetails(item) {
		const featureTypeClass = item.system.data.constructor;
		return foundry.applications.handlebars.renderTemplate(featureTypeClass.previewTemplate, { ...item, item: item, additionalData: await featureTypeClass.getAdditionalData(item.system.data) });
	}

	static #getCost(item) {
		let cost = item.system.data.cost ?? 0;
		if (item.actor.type === 'stash') {
			cost = Math.floor(cost * item.actor.system.rates.item);
		}
		return cost;
	}
}
