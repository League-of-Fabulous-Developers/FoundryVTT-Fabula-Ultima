import { FUItem } from '../../documents/items/item.mjs';

import { PseudoItem } from '../../documents/items/pseudo-item.mjs';

/**
 * @typedef TableConfig
 * @template {Object} D the document of the sheet being rendered
 * @template {Object} T the type of the items in the table
 * @property {string, (() => string)} cssClass
 * @property {string} id An unique identifier to the table.
 * @property {"item", "effect", "custom"} [tablePreset="item"]
 * @property {(document: D, options: FUTableRendererRenderOptions) => T[]} getItems
 * @property {boolean, ((a: D, b: D) => number)} [sort=true] sorting function to determine the order of entries, true means sort using foundry sort order, false means don't sort
 * @property {(element: HTMLElement) => void} activateListeners
 * @property {boolean} [hideIfEmpty=false]
 * @property {((T) => string | Promise<string>)} [renderDescription]
 * @property {string, (() => string | Promise<string>)} [renderRowCaption] renders always visible content between the main table row and the collapsible description. Will bloat vertical size of tables, use sparingly.
 * @property {Record<string, ColumnConfig<T>>} columns
 * @property {Record<string, ((event: PointerEvent, target: HTMLElement) => void)>} actions
 * @property {DragDropConfiguration[]} [dragDrop]
 * @property {AdvancedTableConfig<T>} [advancedConfig]
 */

/**
 * @typedef ColumnConfig
 * @template T
 * @property {boolean} [hideHeader]
 * @property {number} [headerSpan]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string, (() => string | Promise<string>)} [renderHeader]
 * @property {string, ((T) => string | Promise<string>)} renderCell
 */

/**
 * @typedef AdvancedTableConfig
 * @template T
 * @property {(T) => string | number} getKey
 * @property {string} [keyDataAttribute] the data attribute representing each rows key, defaults to 'data-key'
 * @property {AdditionalRowAttribute<T>[]} additionalRowAttributes
 * @property {string} tableClass
 * @property {string} rowClass
 * @property {boolean} draggable defaults to false
 */

/**
 * @typedef RowData
 * @template T
 * @property {String} key
 * @property {T} item
 * @property {Object} additionalAttributes
 */

/**
 * @template T
 * @typedef AdditionalRowAttribute
 * @property {string} attributeName
 * @property {(T) => string} getAttributeValue
 */

export class FUTableRenderer {
	/**
	 * @type TableConfig
	 */
	static TABLE_CONFIG = {};

	/**
	 * @type {Omit<TableConfig, "dragDrop"> & {dragDrop: DragDrop[]}}
	 */
	#tableConfig;

	/**
	 * @type {String} Unique identifier for the table.
	 */
	#tableId;

	/** @type {foundry.applications.api.Application} */
	#application;

	#expandedItems = {};

	#clickHandler = this.#onClick.bind(this);

	/**
	 * @param {TableConfig} overrides
	 */
	constructor(overrides = {}) {
		const configurations = [];
		let cls = this.constructor;
		while (cls !== FUTableRenderer) {
			if (Object.hasOwn(cls, 'TABLE_CONFIG')) configurations.unshift(cls.TABLE_CONFIG);
			cls = Object.getPrototypeOf(cls);
		}

		const config = {};
		configurations.forEach((configuration) => foundry.utils.mergeObject(config, foundry.utils.deepClone(configuration), { performDeletions: true }));

		config.getItems = config.getItems.bind(this);
		if (config.sort instanceof Function) {
			config.sort = config.sort.bind(this);
		} else if (!('sort' in config) || config.sort === true) {
			config.sort = (a, b) => a.sort - b.sort;
		}
		if (config.renderDescription instanceof Function) {
			config.renderDescription = config.renderDescription.bind(this);
		}
		if (config.renderRowCaption instanceof Function) {
			config.renderRowCaption = config.renderRowCaption.bind(this);
		}
		for (const column of Object.values(config.columns ?? {})) {
			column.renderHeader = column.renderHeader instanceof Function ? column.renderHeader.bind(this) : column.renderHeader;
			column.renderCell = column.renderCell.bind(this);
		}
		for (const [action, handler] of Object.entries(config.actions ?? {})) {
			config.actions[action] = handler.bind(this);
		}
		config.dragDrop = (config.dragDrop ?? []).map((dragDropConfig) => {
			dragDropConfig.permissions ??= {};
			for (let key in dragDropConfig.permissions) {
				dragDropConfig.permissions[key] = dragDropConfig.permissions[key].bind(this);
			}

			dragDropConfig.callbacks ??= {};
			for (let key in dragDropConfig.callbacks) {
				dragDropConfig.callbacks[key] = dragDropConfig.callbacks[key].bind(this);
			}

			return new foundry.applications.ux.DragDrop.implementation(dragDropConfig);
		});
		config.tablePreset ??= 'item';
		if (config.tablePreset === 'item') {
			config.advancedConfig = {
				getKey: (item) => item.uuid,
				keyDataAttribute: 'data-uuid',
				additionalRowAttributes: [{ attributeName: 'data-item-id', getAttributeValue: (item) => item.id }],
				tableClass: 'item-list',
				rowClass: 'item',
				draggable: true,
			};
		} else if (config.tablePreset === 'effect') {
			config.advancedConfig = {
				getKey: (effect) => effect.uuid,
				keyDataAttribute: 'data-uuid',
				additionalRowAttributes: [{ attributeName: 'data-effect-id', getAttributeValue: (item) => item.id }],
				tableClass: '',
				rowClass: '',
				draggable: false,
			};
		} else {
			const advancedConfig = config.advancedConfig;
			advancedConfig.getKey = advancedConfig.getKey.bind(this);
			advancedConfig.keyDataAttribute ??= 'data-key';
			if (!advancedConfig.keyDataAttribute.startsWith('data-')) {
				advancedConfig.keyDataAttribute = `data-${advancedConfig.keyDataAttribute}`;
			}
			advancedConfig.additionalRowAttributes ??= [];
			advancedConfig.additionalRowAttributes.forEach((value) => (value.getAttributeValue = value.getAttributeValue.bind(this)));
			advancedConfig.tableClass ??= '';
			advancedConfig.rowClass ??= '';
			advancedConfig.draggable ??= false;
		}
		Object.assign(config, overrides);
		this.#tableId = config.id ?? foundry.utils.randomID();
		this.initializeOptions(config);
		this.#tableConfig = foundry.utils.deepFreeze(config);
	}

	/**
	 * @return {Omit<TableConfig, "dragDrop"> & {dragDrop: DragDrop[]}}
	 */
	get tableConfig() {
		return this.#tableConfig;
	}

	/**
	 * @return {foundry.applications.api.Application}
	 */
	get application() {
		return this.#application;
	}

	/**
	 * @returns {String}
	 */
	get id() {
		return this.#tableId;
	}

	initializeOptions(config) {}

	/**
	 * @typedef FUTableRendererRenderOptions
	 * @property {boolean} [hideIfEmpty]
	 * @property {(T) => string | number} isVisible
	 */

	/**
	 * @param {Document} document
	 * @param {FUTableRendererRenderOptions} options
	 * @return {Promise<string>}
	 */
	async renderTable(document, options = {}) {
		/**
		 * @type {Record<string, {header: string|Promise<string>, cells: Record<string, string|Promise<string>>}>}
		 */
		const columns = {};
		const rowCaptions = {};
		const descriptions = {};
		const rowCssClasses = {};
		const rowTooltips = {};
		const { getItems, tablePreset, sort, columns: columnConfigs = {}, cssClass, renderDescription, renderRowCaption, hideIfEmpty: configHideIfEmpty, advancedConfig } = this.tableConfig;

		/** @type {CompendiumIndexEntry[]} */
		const items = await Promise.resolve(getItems(document, options));

		let shouldHideIfEmpty = configHideIfEmpty ?? false;
		if (options.hideIfEmpty != null) {
			shouldHideIfEmpty = options.hideIfEmpty;
		}

		if (shouldHideIfEmpty && items.length === 0) {
			return '';
		}

		if (sort instanceof Function) {
			items.sort(sort);
		}

		const rowCaptionRenderer = renderRowCaption instanceof Function ? renderRowCaption : () => renderRowCaption;
		const descriptionRenderer = renderDescription instanceof Function ? renderDescription : () => renderDescription;

		for (let [columnKey, columnConfig] of Object.entries(columnConfigs)) {
			columns[columnKey] = {
				hideHeader: columnConfig.hideHeader || !columnConfig.renderHeader,
				headerSpan: columnConfig.headerSpan,
				headerAlignment: columnConfig.headerAlignment ?? 'center',
				header: columnConfig.renderHeader instanceof Function ? columnConfig.renderHeader() : columnConfig.renderHeader,
				cells: {},
			};
		}

		/** @type RowData[] **/
		const rows = [];
		for (let item of items) {
			const rowKey = advancedConfig.getKey(item);
			const visible = options.isVisible ? options.isVisible(item) : true;

			if (tablePreset !== 'custom' && item.parent) {
				if (document !== item.parent && document !== item.parentDocument) {
					let directParentItem = item.parent;
					while (!(directParentItem instanceof FUItem || directParentItem instanceof PseudoItem)) {
						directParentItem = directParentItem.parent;
					}
					let parentItem = directParentItem;
					let parentage = [];
					while (!(parentItem instanceof Actor || parentItem == null)) {
						if (parentItem instanceof FUItem || parentItem instanceof PseudoItem) {
							parentage.unshift(parentItem);
						}
						parentItem = parentItem.parent;
					}
					parentage = parentage.map((item) => item.name).join(' → ');
					rowCssClasses[rowKey] = 'fu-table__row--deeply-nested';
					rowTooltips[rowKey] = game.i18n.format('FU.ItemDeeplyNested', { parent: parentage });
				}
			}

			for (let [columnKey, columnConfig] of Object.entries(columnConfigs)) {
				columns[columnKey].cells[rowKey] = columnConfig.renderCell instanceof Function ? columnConfig.renderCell(item) : columnConfig.renderCell;
			}
			rowCaptions[rowKey] = rowCaptionRenderer(item);
			descriptions[rowKey] = descriptionRenderer(item);

			const additionalAttributes = {};
			for (const { attributeName, getAttributeValue } of advancedConfig.additionalRowAttributes) {
				additionalAttributes[attributeName] = getAttributeValue(item);
			}
			rows.push({ key: rowKey, item, visible, additionalAttributes });
		}

		for (const column of Object.values(columns)) {
			column.header = await column.header;
			for (const [key, cellValue] of Object.entries(column.cells)) {
				column.cells[key] = await cellValue;
			}
		}

		for (let [key, value] of Object.entries(rowCaptions)) {
			rowCaptions[key] = await value;
		}

		for (let [key, value] of Object.entries(descriptions)) {
			descriptions[key] = await value;
		}

		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/fu-table.hbs', {
			tableId: this.#tableId,
			config: advancedConfig,
			items: rows,
			cssClass: cssClass instanceof Function ? cssClass() : cssClass,
			columns,
			rowCssClasses,
			rowTooltips,
			rowCaptions,
			descriptions,
			expandedItems: this.#expandedItems,
		});
	}

	/**
	 * @param {foundry.applications.api.Application} application
	 */
	activateListeners(application) {
		this.#application = application;

		const renderHookId = Hooks.on('renderApplicationV2', (application, element) => {
			if (application === this.application) {
				const tables = element.querySelectorAll(`.fu-table[data-table-id="${this.#tableId}"]`);
				tables.forEach((table) => {
					table.addEventListener('click', this.#clickHandler);
					table.addEventListener('contextmenu', this.#clickHandler);
					this.tableConfig.dragDrop.forEach((dragDrop) => dragDrop.bind(table));
				});
			}
		});

		const closeHookId = Hooks.on('closeApplicationV2', (application) => {
			if (application === this.application) {
				Hooks.off('renderApplicationV2', renderHookId);
				Hooks.off('closeApplicationV2', closeHookId);
			}
		});
	}

	#onClick(event) {
		const table = event.target.closest(`[data-table-id="${this.#tableId}"]`);
		if (table) {
			const keyDataAttribute = this.tableConfig.advancedConfig.keyDataAttribute;
			const row = event.target.closest(`.fu-table__row-container[${keyDataAttribute}]`);
			const actionElement = event.target.closest('[data-action]');
			const contextMenuTrigger = event.target.closest(`[data-context-menu]`);
			if (event.button === 0 && row && !actionElement && !contextMenuTrigger) {
				const rowKey = row.dataset[this.#convertToDatasetKey(keyDataAttribute)];
				const expand = row.querySelector('.fu-table__row-expand');
				if (expand) {
					this.#expandedItems[rowKey] = expand.classList.toggle('fu-table__row-expand--visible');
				}
				return;
			}
			const { actions } = this.tableConfig;
			if (actions && actionElement && actionElement.dataset.action in actions) {
				const action = actionElement.dataset.action;
				event.preventDefault();
				event.stopPropagation();
				actions[action](event, actionElement);
			}
		}
	}

	#convertToDatasetKey(keyDataAttribute) {
		return keyDataAttribute
			.substring(5) //strip 'data-' prefix
			.split('-') // split at dashes
			.map((value, index) => (index > 0 ? value.capitalize() : value)) // capitalize parts beyond first
			.join(''); // join parts
	}
}
