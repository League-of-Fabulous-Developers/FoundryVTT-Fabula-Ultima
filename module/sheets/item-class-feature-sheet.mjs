import { ClassFeatureDataModel } from '../documents/items/classFeature/class-feature-data-model.mjs';
import { FUFeatureSheet } from './item-feature-sheet.mjs';

/**
 * @inheritDoc
 */
export class FUClassFeatureSheet extends FUFeatureSheet {
	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'details':
				{
					if (this.system.data instanceof ClassFeatureDataModel) {
						context.feature = this.system.data.constructor;
						context.featureTemplate = context.feature.template;
					}
				}
				break;
		}
		return context;
	}
}
