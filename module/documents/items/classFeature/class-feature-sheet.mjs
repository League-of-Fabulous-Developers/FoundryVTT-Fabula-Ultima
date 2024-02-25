import { ClassFeatureDataModel } from './class-feature-data-model.mjs';

export class FUClassFeatureSheet extends ItemSheet {
	static get defaultOptions() {
		const featureTabConfigs = [];
		for (let value of Object.values(globalThis.CONFIG.FU.classFeatureRegistry.features())) {
			featureTabConfigs.push(...value.getTabConfigurations());
		}
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['projectfu', 'sheet', 'item'],
			width: 700,
			height: 700,
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
		if (this.item.system.featureType !== formData['system.featureType']) {
			const shouldChangeType = await Dialog.confirm({
				title: game.i18n.localize('FU.ClassFeatureDialogChangeTypeTitle'),
				content: game.i18n.localize('FU.ClassFeatureDialogChangeTypeContent'),
				rejectClose: false,
			});
			if (!shouldChangeType) {
				return this.render();
			}
			const schema = this.item.system.data.constructor.schema;
			schema.apply(function () {
				const path = this.fieldPath.split('.');
				path.shift(); // remove data model name
				path.unshift('system', 'data');
				const field = path.pop();
				path.push(`-=${field}`);
				formData[path.join('.')] = null;
			});
		}
		formData = foundry.utils.expandObject(formData);

		console.log(formData);
		formData.system.data = this.item.system.data.constructor.processUpdateData(formData.system.data) ?? formData.system.data;
		console.log(formData);

		this.object.update(formData);
	}

	constructor(object, options) {
		super(object, options);
	}

	get template() {
		return `systems/projectfu/templates/item/item-class-feature-sheet.hbs`;
	}

	async getData(options = {}) {
		const data = super.getData(options);
		data.system = this.item.system;
		if (data.system.data instanceof ClassFeatureDataModel) {
			data.feature = data.system.data.constructor;
			data.featureTemplate = data.feature.template;
			data.additionalData = await data.feature.getAdditionalData(data.system.data);
			const schema = data.feature.schema;

			data.enrichedHtml = {};
			schema.apply(function () {
				if (this instanceof foundry.data.fields.HTMLField) {
					const path = this.fieldPath.split('.');
					path.shift(); // remove data model name
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
			for (let [key, value] of Object.entries(data.enrichedHtml)) {
				data.enrichedHtml[key] = await TextEditor.enrichHTML(value, { rollData: data.additionalData?.rollData });
			}
		}
		data.features = CONFIG.FU.classFeatureRegistry.features();
		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);

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

		if (this.item.system.data instanceof ClassFeatureDataModel) {
			this.item.system.data.constructor.activateListeners(html.find('[data-feature-content]'), this.item);
		}
	}
}
