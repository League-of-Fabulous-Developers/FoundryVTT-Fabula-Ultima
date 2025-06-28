import { OptionalFeatureDataModel } from '../documents/items/optionalFeature/optional-feature-data-model.mjs';
import { FUFeatureSheet } from './item-feature-sheet.mjs';

/**
 * @description Uses {@link OptionalFeatureTypeDataModel}
 */
export class FUOptionalFeatureSheet extends FUFeatureSheet {
	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'details':
				{
					if (this.system.data instanceof OptionalFeatureDataModel) {
						context.optional = this.system.data.constructor;
						context.optionalTemplate = context.optional.template;
					}
				}
				break;
		}
		return context;
	}
}
