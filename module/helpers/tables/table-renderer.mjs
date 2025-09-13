/**
 * @typedef TableConfig
 * @template {Object} D the document of the sheet being rendered
 * @template {Object} T the type of the items in the table
 * @property {string} cssClass
 * @property {"item", "effect"} [tablePreset="item"]
 * @property {(document: D, options: FUTableRendererRenderOptions) => T[]} getItems
 * @property {boolean, ((a: D, b: D) => number)} [sort=true] sorting function to determine the order of entries, true means sort using foundry sort order, false means don't sort
 * @property {(element: HTMLElement) => void} activateListeners
 * @property {boolean} [hideIfEmpty=false]
 * @property {((T) => string | Promise<string>)} [renderDescription]
 * @property {string, (() => string | Promise<string>)} [renderRowCaption] renders always visible content between the main table row and the collapsible description. Will bloat vertical size of tables, use sparingly.
 * @property {Record<string, ColumnConfig<T>>} columns
 * @property {Record<string, ((event: PointerEvent, target: HTMLElement) => void)>} actions
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

export class FUTableRenderer {
	/**
	 * @type TableConfig
	 */
	static TABLE_CONFIG = {};

	/**
	 * @type TableConfig
	 */
	#tableConfig;

	#tableId = foundry.utils.randomID();

	/** @type {foundry.applications.api.Application} */
	#application;

	#expandedItems = {};

	#clickHandler = this.#onClick.bind(this);

	constructor() {
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

		this.initializeOptions(config);

		this.#tableConfig = foundry.utils.deepFreeze(config);
	}

	/**
	 * @return TableConfig
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

	initializeOptions(config) {}

	/**
	 * @typedef FUTableRendererRenderOptions
	 * @property {boolean} [hideIfEmpty]
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
		const { getItems, tablePreset, sort, columns: columnConfigs = {}, cssClass, renderDescription, renderRowCaption, hideIfEmpty: configHideIfEmpty } = this.tableConfig;

		const items = getItems(document, options);

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

		for (let item of items) {
			for (let [columnKey, columnConfig] of Object.entries(columnConfigs)) {
				columns[columnKey].cells[item.uuid] = columnConfig.renderCell instanceof Function ? columnConfig.renderCell(item) : columnConfig.renderCell;
			}
			rowCaptions[item.uuid] = rowCaptionRenderer(item);
			descriptions[item.uuid] = descriptionRenderer(item);
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

		let presets;
		if (tablePreset === 'effect') {
			presets = {
				dataTypeId: 'data-effect-id',
				tableClass: '',
				rowClass: '',
				draggable: false,
			};
		} else {
			presets = {
				dataTypeId: 'data-item-id',
				tableClass: 'item-list',
				rowClass: 'item',
				draggable: true,
			};
		}

		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/fu-table.hbs', { tableId: this.#tableId, presets, items, cssClass, columns, rowCaptions, descriptions, expandedItems: this.#expandedItems });
	}

	/**
	 * @param {foundry.applications.api.Application} application
	 */
	activateListeners(application) {
		this.#application = application;
		application.element.addEventListener('click', this.#clickHandler);
		application.element.addEventListener('contextmenu', this.#clickHandler);
	}

	#onClick(event) {
		const table = event.target.closest(`[data-table-id="${this.#tableId}"]`);
		if (table) {
			const row = event.target.closest(`.fu-table__row-container[data-uuid]`);
			const actionElement = event.target.closest('[data-action]');
			if (event.button === 0 && row && !actionElement) {
				const uuid = row.dataset.uuid;
				const expand = row.querySelector('.fu-table__row-expand');
				if (expand) {
					this.#expandedItems[uuid] = expand.classList.toggle('fu-table__row-expand--visible');
				}
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
}
