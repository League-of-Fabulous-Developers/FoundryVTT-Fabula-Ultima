import { onManageActiveEffect, prepareActiveEffectCategories } from '../helpers/effects.mjs';
import { FU } from '../helpers/config.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class FUItemSheet extends ItemSheet {
	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['projectfu', 'sheet', 'item', 'backgroundstyle'],
			width: 700,
			height: 700,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'description',
				},
			],
		});
	}

	/** @override */
	get template() {
		const path = 'systems/projectfu/templates/item';
		// Return a single sheet for all item types.
		// return `${path}/item-sheet.hbs`;

		// Alternatively, you could use the following return statement to do a
		// unique item sheet by type, like `weapon-sheet.hbs`.
		return `${path}/item-${this.item.type}-sheet.hbs`;
	}

	/* -------------------------------------------- */

	/** @override */
	async getData() {
		// Retrieve base data structure.
		const context = super.getData();

		// Use a safe clone of the actor data for further operations.
		const actor = this.object?.parent ?? null;
		const actorData = actor ? actor.toObject(false) : null;

		// Use a safe clone of the item data for further operations.
		const itemData = context.item;

		// Retrieve the roll data for TinyMCE editors.
		context.rollData = {};
		if (actor) {
			context.rollData = actor.getRollData();
		}

		// Add the actor's data to context.data for easier access, as well as flags.
		context.system = itemData.system;
		context.flags = itemData.flags;

		// Prepare active effects for easier access
		context.effects = prepareActiveEffectCategories(this.item.effects);

		//Add CONFIG data required
		context.attrAbbr = CONFIG.FU.attributeAbbreviations;
		context.damageTypes = CONFIG.FU.damageTypes;
		context.wpnType = CONFIG.FU.weaponTypes;
		context.handedness = CONFIG.FU.handedness;
		context.weaponCategoriesWithoutCustom = CONFIG.FU.weaponCategoriesWithoutCustom;
		context.heroicType = CONFIG.FU.heroicType;
		context.miscCategories = CONFIG.FU.miscCategories;
		context.consumableType = CONFIG.FU.consumableType;
		context.treasureType = CONFIG.FU.treasureType;
		context.defenses = CONFIG.FU.defenses;

		// Add the actor object to context for easier access
		context.actor = actorData;

		// Enriches description fields within the context object
		context.enrichedHtml = {
			description: await TextEditor.enrichHTML(context.system.description ?? ''),
			zeroTrigger: await TextEditor.enrichHTML(context.system?.zeroTrigger?.description ?? ''),
			zeroEffect: await TextEditor.enrichHTML(context.system?.zeroEffect?.description ?? ''),
		};

		context.FU = FU;

		return context;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Roll handlers, click handlers, etc. would go here.

		// Cast Spell Button

		// [PDFPager Support] Opening Journal PDF pages from PDF Code
		$('#pdfLink').click(function () {
			const inputValue = $('input[name="system.source.value"]').val();
			const match = inputValue.match(/([A-Za-z]+)\s*(\d+)/);

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

		// Active Effect management
		html.on('click', '.effect-control', (ev) => onManageActiveEffect(ev, this.item));

		// Martial/Offensive Toggle
		html.find('#offensive-header').click(this._toggleMartial.bind(this, 'offensive'));
		html.find('#martial-header').click(this._toggleMartial.bind(this, 'martial'));
	}

	_toggleMartial(type) {
		const system = this.item?.system;

		if (system) {
			const updateKey = type === 'offensive' ? 'isOffensive' : 'isMartial';
			this.item.update({ [`system.${updateKey}.value`]: !system[updateKey].value });
		}
	}

	_getSubmitData(updateData = {}) {
		const data = super._getSubmitData(updateData);
		// Prevent submitting overridden values
		const overrides = foundry.utils.flattenObject(this.item.overrides);
		for (let k of Object.keys(overrides)) {
			if (k.startsWith('system.')) delete data[`data.${k.slice(7)}`]; // Band-aid for < v10 data
			delete data[k];
		}
		return data;
	}
}
