import { OptionalFeatureDataModel } from '../documents/items/optionalFeature/optional-feature-data-model.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { FUFeatureSheet } from './item-feature-sheet.mjs';

/**
 * @description Uses {@link OptionalFeatureTypeDataModel}
 */
export class FUOptionalFeatureSheet extends FUFeatureSheet {
	// TODO: Add these tabs
	/**
	 * @returns {ApplicationTab[]}
	 */
	static getFeatureTabs() {
		const featureTabConfigs = [];
		for (let value of Object.values(CONFIG.FU.optionalFeatureRegistry.map)) {
			featureTabConfigs.push(...value.getTabConfigurations());
		}
		return featureTabConfigs;
	}

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'details':
				{
					context.system = this.item.system;
					if (context.system.data instanceof OptionalFeatureDataModel) {
						context.optional = context.system.data.constructor;
						context.optionalTemplate = context.optional.template;
						context.additionalData = await context.optional.getAdditionalData(context.system.data);
						const schema = context.optional.schema;

						context.enrichedHtml = {};
						schema.apply(function () {
							if (this instanceof foundry.data.fields.HTMLField) {
								const path = this.fieldPath.split('.');
								if (!game.release.isNewer(12)) {
									path.shift(); // remove data model name
								}
								path.pop(); // remove actual field name
								let enrichedHtml = context.enrichedHtml;
								let modelData = context.system.data;
								for (let pathFragment of path) {
									enrichedHtml[pathFragment] ??= {};
									enrichedHtml = enrichedHtml[pathFragment];
									modelData = modelData[pathFragment];
								}
								enrichedHtml[this.name] = modelData[this.name];
							}
						});

						async function enrichRecursively(obj) {
							for (let [key, value] of Object.entries(obj)) {
								if (typeof value === 'object') {
									await enrichRecursively(value);
								} else {
									obj[key] = await foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { rollData: context.additionalData?.rollData });
								}
							}
						}

						await enrichRecursively(context.enrichedHtml);
					}
				}
				break;
		}
		return context;
	}
}
