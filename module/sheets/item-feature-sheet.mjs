import { FUItemSheet } from './item-sheet.mjs';
import { systemPath } from '../helpers/config.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { OptionalFeatureRegistry } from '../documents/items/optionalFeature/optional-feature-registry.mjs';
import { ClassFeatureRegistry } from '../documents/items/classFeature/class-feature-registry.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';

export class FUFeatureSheet extends FUItemSheet {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		form: {
			submitOnChange: true,
		},
		actions: {
			changeSubtype: FUFeatureSheet.#changeSubtype,
		},
	};

	/**
	 * @returns {FeatureDataModel}
	 */
	get embeddedFeature() {
		return this.item.system.data.constructor;
	}

	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		...super.PARTS,
		details: {
			template: systemPath(`templates/item/parts/item-details.hbs`),
		},
	};

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'details': {
				context.system = this.system;
				context.fields = this.system.schema.fields;
				context.dataFields = this.embeddedFeature.schema.fields;
				context.additionalData = await this.embeddedFeature.getAdditionalData(context.system.data);

				// Recursively enrich every HTMLField present in the schema, storing the enriched content in the object;
				// It will be referenced by the templates that use it.
				context.enrichedHtml = {};
				const schema = this.embeddedFeature.schema;
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
							obj[key] = await foundry.applications.ux.TextEditor.implementation.enrichHTML(value, {
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
				break;
			}
		}
		return context;
	}

	/**
	 * @description Allow subclasses to dynamically configure render parts.
	 * @param {HandlebarsRenderOptions} options
	 * @returns {Record<string, HandlebarsTemplatePart>}
	 * @protected
	 */
	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);
		return parts;
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
				{
					this.embeddedFeature.activateListeners(html, this.item, this);
					const secondaryTabs = this.embeddedFeature.getTabConfigurations();
					if (secondaryTabs) {
						for (const tab of secondaryTabs) {
							FoundryUtils.bindTabs(tab, html);
						}
					}
				}
				break;
		}
	}

	/**
	 * Configuration of application tabs, with an entry per tab group.
	 * @type {Record<string, ApplicationTabsConfiguration>}
	 * @override
	 */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'details', label: 'FU.ClassFeatureDetails', icon: 'ra ra-double-team' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' },
			],
			initial: 'details',
		},
	};

	/**
	 * Prepare application tab data for a single tab group.
	 * @param {string} group The ID of the tab group to prepare
	 * @returns {Record<string, ApplicationTab>}
	 * @protected
	 */
	_prepareTabs(group) {
		const tabs = super._prepareTabs(group);
		return tabs;
	}

	/** @inheritDoc */
	async _onSubmitForm(formConfig, event) {
		// eslint-disable-next-line no-undef
		const formData = new FormDataExtended(this.element);
		const embeddedData = FUFeatureSheet.collectSystemData(formData.object);
		if (Object.keys(embeddedData).length > 0) {
			this.item.update(embeddedData);
		}
		await super._onSubmitForm(formConfig, event);
	}

	static collectSystemData(obj) {
		const result = {};

		for (const [key, value] of Object.entries(obj)) {
			if (key.startsWith('system.data')) {
				result[key] = value;
			}
		}

		return result;
	}

	/**
	 * @returns {String}
	 */
	get localizedSubtype() {
		if (this.item.type === 'optionalFeature') {
			const type = this.item.system.optionalType;
			return OptionalFeatureRegistry.instance.localize(type);
		} else if (this.item.type === 'classFeature') {
			const type = this.item.system.featureType;
			return ClassFeatureRegistry.instance.localize(type);
		}
		return null;
	}

	/**
	 * @this FUFeatureSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #changeSubtype(event, target) {
		const subTypes = this.getSubTypes();

		const options = FoundryUtils.generateConfigOptions(subTypes);
		const selectedType = await FoundryUtils.selectOptionDialog('Change Type', options);
		if (selectedType != null) {
			if (this.item.type === 'optionalFeature') {
				//typeField = 'optionalType';
				/** @type OptionalFeatureTypeDataModel **/
				const system = this.item.system;
				const currentType = system.optionalType;
				if (selectedType !== currentType) {
					console.debug(`Changing subtype to ${selectedType} from ${currentType}`);
					const updates = {};
					updates['system.optionalType'] = selectedType;
					await this.item.update(updates);
				}
			} else if (this.item.type === 'classFeature') {
				/** @type ClassFeatureDataModel **/
				const system = this.item.system;
				const currentType = system.featureType;
				if (selectedType !== currentType) {
					console.debug(`Changing subtype to ${selectedType} from ${currentType}`);
					const updates = {};
					updates['system.featureType'] = selectedType;
					await this.item.update(updates);
				}
			}
		}
	}

	/**
	 * @returns {Record}
	 */
	getSubTypes() {
		switch (this.item.type) {
			case 'heroic':
				return CONFIG.FU.heroicType;
			case 'miscAbility':
				return CONFIG.FU.miscCategories;
			case 'consumable':
				return CONFIG.FU.consumableType;
			case 'classFeature':
				return CONFIG.FU.classFeatureRegistry.entries;
			case 'optionalFeature':
				return CONFIG.FU.optionalFeatureRegistry.entries;
			case 'treasure':
				return CONFIG.FU.treasureType;
		}
		return null;
	}
}
