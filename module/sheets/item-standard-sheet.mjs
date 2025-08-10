import * as CONFIG from '../helpers/config.mjs';
import { systemPath } from '../helpers/config.mjs';
import { Traits } from '../pipelines/traits.mjs';
import { SheetUtils } from './sheet-utils.mjs';

import { ItemPartialTemplates } from '../documents/items/item-partial-templates.mjs';
import { FUItemSheet } from './item-sheet.mjs';

// TODO: Refactor to FUStandardItemSheet and so on..

/**
 * @description Extend the basic ItemSheet with some very simple modifications
 * @property {FUItem} item
 * @property {FUItemDataModel} system
 * @extends {ItemSheet}
 */
export class FUStandardItemSheet extends FUItemSheet {
	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		...super.PARTS,
		description: { template: systemPath(`templates/item/parts/item-description.hbs`) },
		attributes: {
			template: systemPath(`templates/item/parts/item-attributes.hbs`),
			templates: Object.values(ItemPartialTemplates).map((pt) => pt.template),
		},
	};

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		switch (partId) {
			case 'description':
				context.enrichedHtml = await SheetUtils.prepareEnrichedTextEditor(this, 'system.description');
				break;
			case 'attributes':
				{
					context.attrAbbr = CONFIG.FU.attributeAbbreviations;
					context.damageTypes = CONFIG.FU.damageTypes;
					context.wpnType = CONFIG.FU.weaponTypes;
					context.handedness = CONFIG.FU.handedness;
					context.weaponCategoriesWithoutCustom = CONFIG.FU.weaponCategoriesWithoutCustom;
					context.defenses = CONFIG.FU.defenses;
					context.resAbbr = CONFIG.FU.resourcesAbbr;
					context.targetingRules = CONFIG.FU.targetingRules;
					context.attributePartials = this.generateAttributePartials();
				}
				break;
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
		//parts.main.template = systemPath(`item-${this.item.type}-sheet.hbs`);
		return parts;
	}

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'description', label: 'FU.Description', icon: 'ra ra-double-team' },
				{ id: 'attributes', label: 'FU.Attributes', icon: 'ra ra-hand' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' },
			],
			initial: 'description',
		},
	};

	/** @inheritdoc */
	_prepareTabs(group) {
		const tabs = super._prepareTabs(group);

		switch (this.item.type) {
			default:
				break;
		}

		return tabs;
	}

	generateAttributePartials() {
		let attributePartials = {
			flex: [],
			settings: [],
			section: [],
			grid: [],
		};
		for (const tp of this.system.attributePartials) {
			if (tp.group) {
				attributePartials[tp.group].push(tp.template);
			} else {
				attributePartials.flex.push(tp.template);
			}
		}
		return attributePartials;
	}

	/* -------------------------------------------- */
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
			case 'attributes':
				{
					// Martial/Offensive Toggle
					const offensiveHeader = html.querySelector('#offensive-header');
					const martialHeader = html.querySelector('#martial-header');
					offensiveHeader?.addEventListener('click', () => this._toggleMartial('offensive'));
					martialHeader?.addEventListener('click', () => this._toggleMartial('martial'));
				}
				break;
		}
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;
		// TODO: Move to header part?
		// Render traits
		const traitsSelector = html.querySelector('#traits-selector');
		traitsSelector?.addEventListener('change', (event) => {
			const selectedIndex = traitsSelector.selectedIndex;
			const selectedValue = Object.keys(Traits)[selectedIndex];
			const currentTraits = this.item.system.traits;
			if (selectedValue && !currentTraits.includes(selectedValue)) {
				console.debug(`Adding trait '${selectedValue}' to ${this.item.name}`);
				currentTraits.push(selectedValue);
				this.item.update({ ['system.traits']: currentTraits });
			}
			traitsSelector.value = '';
		});
	}

	/* -------------------------------------------- */
	_toggleMartial(type) {
		const system = this.item?.system;
		if (system) {
			const updateKey = type === 'offensive' ? 'isOffensive' : 'isMartial';
			this.item.update({ [`system.${updateKey}.value`]: !system[updateKey].value });
		}
	}
}
