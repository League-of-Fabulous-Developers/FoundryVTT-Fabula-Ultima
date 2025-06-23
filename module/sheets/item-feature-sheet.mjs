import { FUItemSheet } from './item-sheet.mjs';
import { systemPath } from '../helpers/config.mjs';
import { FoundryUtils } from '../helpers/foundry-utils.mjs';
import * as CONFIG from '../helpers/config.mjs';
import { OptionalFeatureRegistry } from '../documents/items/optionalFeature/optional-feature-registry.mjs';
import { ClassFeatureRegistry } from '../documents/items/classFeature/class-feature-registry.mjs';

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

	/**
	 * Handle submission for an Application which uses the form element.
	 * @param {ApplicationFormConfiguration} formConfig     The form configuration for which this handler is bound
	 * @param {Event|SubmitEvent} event                     The form submission event
	 * @returns {Promise<void>}
	 * @protected
	 */
	async _onSubmitForm(formConfig, event) {
		//const form = event.currentTarget;

		//const formData = new FormDataExtended(form);
		return super._onSubmitForm(formConfig, event);
	}

	/**
	 * @virtual
	 */
	static getFeatureTabs() {
		return [];
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
