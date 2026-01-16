import FUApplication from '../application.mjs';
import { SystemControls } from '../../helpers/system-controls.mjs';
import { systemId, systemTemplatePath } from '../../helpers/system-utils.mjs';

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

/**
 * @property {CompendiumIndexEntry[]} actors
 */
export class FUCompendiumIndex {
	/**
	 * @type {Record<string, CompendiumIndexEntry[]>}
	 */
	#items;

	/**
	 * @param {Boolean} force
	 * @returns {Record<string, CompendiumIndexEntry[]>}
	 */
	async getItems(force) {
		if (!this.#items || force) {
			this.#items = await this.getEntries('Item');
		}
		return this.#items;
	}

	/**
	 *
	 * @param type
	 * @param force
	 * @returns {Promise<CompendiumIndexEntry[]>}
	 */
	async getItemsOfType(type, force) {
		const items = await this.getItems(force);
		if (items.type) {
			return items.type;
		}
		return [];
	}

	/**
	 * @param {String} type type of document.
	 * @returns {[]}
	 */
	getSystemPacks(type) {
		return game.packs.filter((p) => p.documentName === type && p.metadata.packageName.startsWith(systemId));
	}

	/**
	 * @param {string} type Document type (e.g. "Item")
	 * @returns {Promise<Record<string, CompendiumIndexEntry[]>>}
	 */
	async getEntries(type) {
		/** @type {Record<string, CompendiumIndexEntry[]>} */
		const result = {};
		const packs = this.getSystemPacks(type);

		for (const pack of packs) {
			const entries = await pack.getIndex({
				fields: ['name', 'img', 'type'],
			});

			for (const entry of entries) {
				const key = entry.type ?? 'unknown';

				(result[key] ??= []).push({
					uuid: entry.uuid,
					name: entry.name,
					img: entry.img,
					type: entry.type,
					pack: pack.collection,
					system: entry.system,
				});
			}
		}

		return result;
	}
}

export class FUCompendiumBrowser extends FUApplication {
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
	 * @type {FUCompendiumIndex}
	 */
	static #index = new FUCompendiumIndex();

	/**
	 * @type {FUCompendiumBrowser}
	 */
	static #instance;

	constructor(data = {}, options = {}) {
		options.title = 'FU.CompendiumBrowser';
		super(data, options);
	}

	/**
	 * @returns {FUCompendiumBrowser}
	 */
	static get instance() {
		if (!FUCompendiumBrowser.#instance) {
			FUCompendiumBrowser.#instance = new FUCompendiumBrowser({}, {});
		}
		return FUCompendiumBrowser.#instance;
	}

	/**
	 * @returns {FUCompendiumIndex}
	 * @remarks The index is statically cached.
	 */
	get index() {
		return FUCompendiumBrowser.#index;
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
				context.items = await this.index.getItems();
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
					FUCompendiumBrowser.instance.render(true);
				},
			});
		};
		Hooks.on(SystemControls.HOOK_GET_SYSTEM_TOOLS, onGetSystemTools);
	}

	/**
	 * @this FUCompendiumBrowser
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async refresh(event, target) {
		// TODO: Reload indexes
		return this.render(true);
	}
}
