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

class CompendiumTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		getItems: async (entries) => entries,
		tablePreset: 'item',
	};
}

class ClassCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-classes-table',
		// getItems: async (entries) => entries,
		// tablePreset: 'item',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			class: CommonColumns.propertyColumn('FU.Class', 'system.class.value'),
			sl: CommonColumns.propertyColumn('FU.SkillLevel', 'system.level.max'),
		},
	};
}

class EquipmentCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-equipment-table',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name' }),
			cost: CommonColumns.propertyColumn('FU.Cost', 'system.cost.value'),
		},
	};
}

class AdversariesCompendiumTableRenderer extends CompendiumTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		...super.TABLE_CONFIG,
		cssClass: 'compendium-adversaries-table',
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
		form: { closeOnSubmit: false },
		position: { width: 800, height: '800' },
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
	/**
	 * @type {String}
	 */
	#activeTabId;
	// TODO: Implement a more complex filter
	static #filter;

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

	/** @inheritdoc */
	async _onClose(options) {
		CompendiumBrowser.#filter = undefined;
		return super._onClose(options);
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
					// TODO: Render part-specific filters?
				}
				break;

			case 'classes':
			case 'adversaries':
			case 'equipment':
				{
					context.tables = this.getTables();
				}
				break;
		}
		return context;
	}

	async _onFirstRender(context, options) {
		return this.renderTables('classes', true);
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
			case 'sidebar':
				{
					const searchInput = element.querySelector('#search');
					const debounce = (fn, ms) => {
						let timer;
						return (...args) => {
							clearTimeout(timer);
							timer = setTimeout(() => fn(...args), ms);
						};
					};
					searchInput.addEventListener(
						'input',
						debounce(() => this.#applyFilters(), 150),
					);
					//searchInput?.addEventListener('input', () => this.#applyFilters());
				}
				break;
			case 'tabs': {
				const tabs = element.querySelectorAll('[data-tab]');
				for (const tab of tabs) {
					tab.addEventListener('click', (event) => {
						const tabId = event.currentTarget.dataset.tab;
						this.renderTables(tabId);
					});
				}
				break;
			}
		}
	}

	/**
	 * Set a predicate function to filter entries.
	 * @param {(entry: CompendiumIndexEntry) => boolean} func
	 */
	setFilter(func) {
		CompendiumBrowser.#filter = func;
	}

	filter(entry) {
		if (CompendiumBrowser.#filter) {
			return CompendiumBrowser.#filter(entry);
		}
		return true;
	}

	#classRenderer = new ClassCompendiumTableRenderer();
	#equipmentRenderer = new EquipmentCompendiumTableRenderer();
	#adversaryRenderer = new AdversariesCompendiumTableRenderer();

	async #applyFilters() {
		// Read filter values
		const search = this.element.querySelector('#search')?.value.toLowerCase() || '';
		//let updated = false;
		this.setFilter((entry) => {
			if (search) {
				if (!entry.name.toLowerCase().includes(search.toLowerCase())) {
					return false;
				}
			}
			return true;
		});
		console.debug(`[COMPENDIUM]: Search filter updated to '${search}' (${this.#activeTabId})`);
		return this.renderTables(this.#activeTabId, true);
	}

	/**
	 * @typedef TableRenderingData
	 * @property {CompendiumIndexEntry[]} entries
	 * @property {CompendiumTableRenderer} renderer
	 */

	#renderedTables = [];
	getTables() {
		return this.#renderedTables;
	}

	/**
	 * @param {TableRenderingData[]} tables
	 */
	async setTables(tables) {
		let result = [];
		for (const trd of tables) {
			const filteredEntries = trd.entries.filter(this.filter);
			if (filteredEntries.length > 0) {
				result.push(await trd.renderer.renderTable(filteredEntries, { hideIfEmpty: true }));
			}
		}
		this.#renderedTables = result;
	}

	/**
	 *
	 * @param {String} tabId
	 * @param {Boolean} force
	 * @returns {Promise<void>}
	 */
	async renderTables(tabId, force = false) {
		if (this.#activeTabId === tabId && !force) {
			return;
		}
		this.#activeTabId = tabId;

		switch (tabId) {
			case 'classes':
				{
					const classes = await this.index.getClasses();
					await this.setTables([
						{
							entries: classes.all,
							renderer: this.#classRenderer,
						},
					]);
					this.render(false, { parts: ['classes'] });
				}
				break;

			case 'equipment':
				{
					const equipment = await this.index.getEquipment();
					await this.setTables([
						{
							entries: equipment.all,
							renderer: this.#equipmentRenderer,
						},
					]);
					this.render(false, { parts: ['equipment'] });
				}
				break;

			case 'adversaries':
				{
					const characters = await this.index.getCharacters();
					await this.setTables([
						{
							entries: characters.npc,
							renderer: this.#adversaryRenderer,
						},
					]);
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
