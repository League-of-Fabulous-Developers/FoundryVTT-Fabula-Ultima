import FUApplication from '../application.mjs';
import { SystemControls } from '../../helpers/system-controls.mjs';
import { systemTemplatePath } from '../../helpers/system-utils.mjs';
import { FUTableRenderer } from '../../helpers/tables/table-renderer.mjs';
import { CommonDescriptions } from '../../helpers/tables/common-descriptions.mjs';
import { CommonColumns } from '../../helpers/tables/common-columns.mjs';
import { CompendiumIndex } from './compendium-index.mjs';

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

export class CompendiumItemTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: '',
		getItems: async (items) => {
			return items;
		},
		tablePreset: 'item',
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemAnchorColumn({ columnName: 'FU.Name', headerSpan: 2 }),
		},
	};
}

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
			resizable: true,
		},
		position: { width: 640, height: 'auto' },
		actions: {},
	};

	/** @override
	 * @type Record<ApplicationTab>
	 * */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'items', label: 'FU.Items', icon: 'ra ra-double-team' },
				{ id: 'actors', label: 'FU.Actors', icon: 'ra ra-double-team' },
			],
			initial: 'items',
		},
	};

	/**
	 * @override
	 */
	static PARTS = {
		tabs: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-tabs'),
		},
		items: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-items'),
		},
		actors: {
			template: systemTemplatePath('ui/compendium-browser/compendium-browser-actors'),
		},
	};

	/**
	 * The current compendium index.
	 * @type {CompendiumIndex}
	 */
	static #index = new CompendiumIndex();

	/**
	 * @type {CompendiumBrowser}
	 */
	static #instance;

	#itemsTable = new CompendiumItemTableRenderer();

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
		return CompendiumBrowser.#index;
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
			case 'items':
				context.items = await this.index.getItemsOfType('class');
				// TODO: Update the table renderer?
				context.itemsTable = await this.#itemsTable.renderTable(context.items, { hideIfEmpty: true });
				break;
			case 'actors':
				break;
		}
		return context;
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
