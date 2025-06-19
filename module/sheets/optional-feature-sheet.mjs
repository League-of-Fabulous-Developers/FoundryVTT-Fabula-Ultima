import { OptionalFeatureDataModel } from '../documents/items/optionalFeature/optional-feature-data-model.mjs';
import { FUItemSheet } from './item-sheet.mjs';
import * as CONFIG from '../helpers/config.mjs';

export class FUOptionalFeatureSheet extends FUItemSheet {
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

	async _updateObject(event, formData) {
		if (!this.object.id) return;

		// on change of feature type ask user to confirm user
		if (this.item.system.optionalType !== formData['system.optionalType']) {
			const shouldChangeType = await Dialog.confirm({
				title: game.i18n.localize('FU.OptionalFeatureDialogChangeTypeTitle'),
				content: game.i18n.localize('FU.OptionalFeatureDialogChangeTypeContent'),
				options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
				rejectClose: false,
			});

			if (!shouldChangeType) {
				return this.render();
			}

			// remove all the formData referencing the old data model
			for (const key of Object.keys(formData)) {
				if (key.startsWith('system.data.')) {
					delete formData[key];
				}
			}

			// recursively add delete instructions for every field in the old data model
			const schema = this.item.system.data.constructor.schema;
			schema.apply(function () {
				const path = this.fieldPath.split('.');
				if (!game.release.isNewer(12)) {
					path.shift(); // remove data model name
				}
				path.unshift('system', 'data');
				const field = path.pop();
				path.push(`-=${field}`);
				formData[path.join('.')] = null;
			});
		} else {
			formData = foundry.utils.expandObject(formData);
			formData.system.data = this.item.system.data.constructor.processUpdateData(formData.system.data) ?? formData.system.data;
		}

		this.object.update(formData);
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
									obj[key] = await TextEditor.enrichHTML(value, { rollData: context.additionalData?.rollData });
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
