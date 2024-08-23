import { OptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { onManageActiveEffect, prepareActiveEffectCategories } from '../../../helpers/effects.mjs';

export class FUOptionalFeatureSheet extends ItemSheet {
	static get defaultOptions() {
		// add all the tab configurations from registered class features
		const featureTabConfigs = [];
		for (let value of Object.values(CONFIG.FU.optionalFeatureRegistry.optionals())) {
			featureTabConfigs.push(...value.getTabConfigurations());
		}
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['projectfu', 'sheet', 'item', 'backgroundstyle'],
			width: 700,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'description',
				},
				...featureTabConfigs,
			],
		});
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

	constructor(object, options) {
		super(object, options);
	}

	get template() {
		return `systems/projectfu/templates/item/item-optional-feature-sheet.hbs`;
	}

	async getData(options = {}) {
		const data = super.getData(options);
		data.system = this.item.system;
		if (data.system.data instanceof OptionalFeatureDataModel) {
			data.optional = data.system.data.constructor;
			data.optionalTemplate = data.optional.template;
			data.additionalData = await data.optional.getAdditionalData(data.system.data);
			const schema = data.optional.schema;

			data.enrichedHtml = {};
			schema.apply(function () {
				if (this instanceof foundry.data.fields.HTMLField) {
					const path = this.fieldPath.split('.');
					if (!game.release.isNewer(12)) {
						path.shift(); // remove data model name
					}
					path.pop(); // remove actual field name
					let enrichedHtml = data.enrichedHtml;
					let modelData = data.system.data;
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
						obj[key] = await TextEditor.enrichHTML(value, { rollData: data.additionalData?.rollData });
					}
				}
			}

			await enrichRecursively(data.enrichedHtml);
		}
		data.optionals = CONFIG.FU.optionalFeatureRegistry.optionals();
		data.effects = prepareActiveEffectCategories(this.item.effects);
		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);

		html.find('.regenerate-fuid-button').click(async (event) => {
			event.preventDefault();

			// Call the regenerateFUID method on the item
			const newFUID = await this.item.regenerateFUID();

			if (newFUID) {
				this.render();
			}
		});

		html.find('.effect-control').click((ev) => onManageActiveEffect(ev, this.item));

		html.find('[data-action=pdfLink]').click(() => {
			const match = this.item.system.source.match(/([A-Za-z]+)\s*(\d+)/);

			if (match) {
				const pdfCode = match[1];
				const pageNumber = match[2];

				// Check if the openPDFByCode function exists
				if (ui.pdfpager && ui.pdfpager.openPDFByCode) {
					ui.pdfpager.openPDFByCode(pdfCode, { page: pageNumber });
				} else {
					// TODO: Create Fallback method using a normal Foundry link
				}
			} else {
				console.error('Invalid input format. Please use proper syntax "PDFCode PageNumber"');
			}
		});

		if (this.item.system.data instanceof OptionalFeatureDataModel) {
			this.item.system.data.constructor.activateListeners(html.find('[data-optional-content]'), this.item, this);
		}
	}
}
