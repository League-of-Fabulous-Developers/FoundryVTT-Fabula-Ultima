import { OptionalFeatureDataModel } from '../documents/items/optionalFeature/optional-feature-data-model.mjs';
import { FUItemSheet } from './item-sheet.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { systemPath } from '../helpers/config.mjs';

/**
 * @description Uses {@link OptionalFeatureTypeDataModel}
 */
export class FUOptionalFeatureSheet extends FUItemSheet {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		form: {
			submitOnChange: true,
		},
	};

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'details', label: 'FU.ClassFeatureDetails', icon: 'ra ra-double-team' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' },
			].concat(this.getFeatureTabs()),
			initial: 'details',
		},
	};

	// TODO: Add these tabs
	/**
	 * @returns {ApplicationTab[]}
	 */
	static getFeatureTabs() {
		const featureTabConfigs = [];
		for (let value of Object.values(CONFIG.FU.optionalFeatureRegistry.optionals())) {
			featureTabConfigs.push(...value.getTabConfigurations());
		}
		return featureTabConfigs;
	}

	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		...super.PARTS,
		details: { template: systemPath(`templates/item/parts/item-details.hbs`) },
	};

	/**
	 * Attach event listeners to rendered template parts.
	 * @param {string} partId The id of the part being rendered
	 * @param {HTMLElement} html The rendered HTML element for the part
	 * @param {ApplicationRenderOptions} options Rendering options passed to the render method
	 * @protected
	 */
	_attachPartListeners(partId, html, options) {
		super._attachPartListeners(partId, html, options);
		switch (partId) {
			case 'details':
				this.item.system.data.constructor.activateListeners(html, this.item, this);
				break;
		}
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

	// async _onChangeForm(formConfig, event) {
	// 	switch (event.target.name) {
	// 		case 'system.optionalType':
	// 			{
	// 				const formData = new foundry.applications.ux.FormDataExtended(this.element);
	// 				const submit = await super.promptChangeDataType(formData, this.item, {
	// 					typeField: 'optionalType',
	// 					titleKey: 'FU.OptionalFeatureDialogChangeTypeTitle',
	// 					contentKey: 'FU.OptionalFeatureDialogChangeTypeContent',
	// 				});
	// 				if (!submit) {
	// 					return;
	// 				}
	// 			}
	// 			break;
	// 	}
	// 	super._onChangeForm(formConfig, event);
	// }
}
