import FUApplication from '../application.mjs';
import { SystemControls } from '../../helpers/system-controls.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUTableRenderer } from '../../helpers/tables/table-renderer.mjs';
import { CommonDescriptions } from '../../helpers/tables/common-descriptions.mjs';
import { CommonColumns } from '../../helpers/tables/common-columns.mjs';
import { CompendiumIndex } from './compendium-index.mjs';
import { FU } from '../../helpers/config.mjs';

/**
 * @typedef CompendiumIndexEntry
 * @property {string} _id            Document ID within the compendium
 * @property {string} uuid           Fully-qualified UUID
 * @property {string} name           Document name
 * @property {string|null} img       Image path
 * @property {string} type           Document subtype
 * @property {string} pack           Compendium collection key (e.g. "fu.items")
 * @property {Object} [system]       Partial system data (indexed fields only)
 */

class CompendiumTableRender extends FUTableRenderer {}

class ItemCompendiumTableRenderer extends CompendiumTableRender {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'compendium-classes-table',
		getItems: async (entries) => entries,
		tablePreset: 'item',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			class: CommonColumns.propertyColumn('FU.Class', 'system.class.value'),
			sl: CommonColumns.propertyColumn('FU.SkillLevel', 'system.level.max'),
		},
	};
}

class EquipmentCompendiumTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'compendium-equipment-table',
		getItems: async (entries) => entries,
		tablePreset: 'item',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			cost: CommonColumns.propertyColumn('FU.Cost', 'system.cost.value'),
		},
	};
}

class AdversariesCompendiumTableRenderer extends CompendiumTableRender {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'compendium-adversaries-table',
		getItems: async (entries) => entries,
		tablePreset: 'item',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			species: CommonColumns.propertyColumn('FU.Species', 'system.species.value', FU.species),
			role: CommonColumns.propertyColumn('FU.Role', 'system.role.value', FU.role),
			rank: CommonColumns.propertyColumn('FU.Rank', 'system.rank.value', FU.rank),
		},
	};
}

/**
 * @desc A system-specific compendium browser with integrations throughout the system.
 */
export class CompendiumBrowser extends FUApplication {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['fu', 'fu-application'],
		window: {
			title: 'FU.CompendiumBrowser',
			icon: 'fas fa-book',
			contentClasses: ['fu-application__browser'],
			resizable: true,
		},
		position: { width: 800, height: 'auto' },
		actions: {},
	};

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'classes', label: 'FU.Classes', icon: 'ra ra-double-team' },
				{ id: 'equipment', label: 'FU.Equipment', icon: 'ra ra-double-team' },
				{ id: 'adversaries', label: 'FU.Adversaries', icon: 'ra ra-monster' },
			],
			initial: 'classes',
		},
	};

	/**
	 * @override
	 */
	static PARTS = {
		// Layout
		tabs: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-tabs'),
		},
		sidebar: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-sidebar'),
		},
		// Tabs
		classes: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-classes'),
		},
		equipment: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-equipment'),
		},
		adversaries: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-adversaries'),
		},
	};

	/**
	 * @type {CompendiumBrowser}
	 */
	static #instance;

	constructor(data = {}, options = {}) {
		options.title = 'FU.CompendiumBrowser';
		super(data, options);
	}

	/**
	 * @returns {CompendiumBrowser}
	 */
	static get instance() {
		if (!CompendiumBrowser.#instance) {
			CompendiumBrowser.#instance = new CompendiumBrowser({}, {});
		}
		return CompendiumBrowser.#instance;
	}

	/**
	 * @returns {CompendiumIndex}
	 * @remarks The index is statically cached.
	 */
	get index() {
		return CompendiumIndex.instance;
	}

	/** @inheritdoc */
	async _preparePartContext(partId, ctx, options) {
		const context = await super._preparePartContext(partId, ctx, options);
		// IMPORTANT: Set the active tab
		if (partId in context.tabs) context.tab = context.tabs[partId];
		switch (partId) {
			case 'tabs':
				context.tabs = this._prepareTabs('primary');
				break;

			case 'sidebar':
				{
					// TODO: Part-specific filters
				}
				break;

			case 'classes':
				{
					context.classTable = this.getTable('class');
				}
				break;

			case 'adversaries':
				{
					context.adversariesTable = this.getTable('adversaries');
				}
				break;

			case 'equipment':
				{
					context.equipmentTable = this.getTable('equipment');
				}
				break;
		}
		return context;
	}

	async _onFirstRender(context, options) {
		return this.#onTabActivated('classes');
	}

	/**
	 * @override
	 * @param partId
	 * @param element
	 * @param options
	 * @private
	 */
	_attachPartListeners(partId, element, options) {
		super._attachPartListeners(partId, element, options);
		switch (partId) {
			case 'tabs': {
				const tabs = element.querySelectorAll('[data-tab]');
				for (const tab of tabs) {
					tab.addEventListener('click', (event) => {
						const tabId = event.currentTarget.dataset.tab;
						this.#onTabActivated(tabId);
					});
				}
				break;
			}
		}
	}

	#classRenderer = new ItemCompendiumTableRenderer();
	#equipmentRenderer = new EquipmentCompendiumTableRenderer();
	#adversaryRenderer = new AdversariesCompendiumTableRenderer();

	#renderedTables = {};
	getTable(name) {
		return this.#renderedTables[name];
	}
	setTable(name, content) {
		this.#renderedTables[name] = content;
	}

	async #onTabActivated(tabId) {
		if (this._loadedTabs?.has(tabId)) return;
		this._loadedTabs ??= new Set();
		this._loadedTabs.add(tabId);

		switch (tabId) {
			case 'classes':
				{
					const classes = await this.index.getClasses();
					this.setTable('class', await this.#classRenderer.renderTable(classes.all, { hideIfEmpty: true }));
					this.render(false, { parts: ['classes'] });
				}
				break;

			case 'equipment':
				{
					const equipment = await this.index.getEquipment();
					this.setTable('equipment', await this.#equipmentRenderer.renderTable(equipment.all, { hideIfEmpty: true }));
					this.render(false, { parts: ['equipment'] });
				}
				break;

			case 'adversaries':
				{
					const characters = await this.index.getCharacters();
					this.setTable('adversaries', await this.#adversaryRenderer.renderTable(characters.npc, { hideIfEmpty: true }));
					this.render(false, { parts: ['adversaries'] });
				}

				break;
		}
	}

	static initialize() {
		/**
		 * @param {SystemControlTool[]} tools
		 */
		const onGetSystemTools = (tools) => {
			tools.push({
				name: 'FU.CompendiumBrowser',
				icon: 'fa-solid fa-book',
				onClick: () => {
					CompendiumBrowser.instance.render(true);
				},
			});
		};
		Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);
	}

	/**
	 * @this CompendiumBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async refresh(event, target) {
		// TODO: Reload indexes
		return this.render(true);
	}
}
