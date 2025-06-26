import { ClassFeatureDataModel } from '../documents/items/classFeature/class-feature-data-model.mjs';
import { FUFeatureSheet } from './item-feature-sheet.mjs';

export class FUClassFeatureSheet extends FUFeatureSheet {
	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'details':
				{
					context.system = this.system;
					if (context.system.data instanceof ClassFeatureDataModel) {
						context.feature = context.system.data.constructor;
						context.featureTemplate = context.feature.template;
						context.additionalData = await context.feature.getAdditionalData(context.system.data);
						const schema = context.feature.schema;

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

						async function enrichRecursively(obj, { rollData, secrets, actor }) {
							for (let [key, value] of Object.entries(obj)) {
								if (typeof value === 'object') {
									await enrichRecursively(value, { rollData, secrets, actor });
								} else {
									obj[key] = await TextEditor.enrichHTML(value, {
										rollData,
										secrets,
										relativeTo: actor,
									});
								}
							}
						}
						await enrichRecursively(context.enrichedHtml, {
							rollData: context.additionalData?.rollData,
							secrets: this.item.isOwner,
							actor: this.item.parent,
						});
					}
				}
				break;
		}
		return context;
	}
}
