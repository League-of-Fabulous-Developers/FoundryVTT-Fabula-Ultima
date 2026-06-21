import { BasePseudoDocument } from './base-pseudo-document.mjs';

/**
 * This class is the pseudo document mirror to the core ClientDocumentMixin.
 * It is maintained separately for easier synchronization with the core class.
 */
export class PseudoDocument extends BasePseudoDocument {
	constructor(data, context) {
		super(data, context);

		/**
		 * A collection of Application instances which should be re-rendered whenever this document is updated.
		 * The keys of this object are the application ids and the values are Application instances. Each
		 * Application in this object will have its render method called by {@link Document#render}.
		 * @type {Record<string,Application|ApplicationV2>}
		 * @see {@link PseudoDocument#render}
		 */
		Object.defineProperty(this, 'apps', {
			value: {},
			writable: false,
			enumerable: false,
		});

		/**
		 * A cached reference to the FormApplication instance used to configure this Document.
		 * @type {FormApplication|null}
		 * @private
		 */
		Object.defineProperty(this, '_sheet', { value: null, writable: true, enumerable: false });
	}

	static name = 'PseudoDocument';

	_initialize(options) {
		super._initialize(options);
		if (!game._documentsReady) return;
		if (this.parent?.collections[this.parentCollection]?._initialized === false) {
			return; // Skip documents in uninitialized embedded collections
		}
		Object.entries(this.collections).forEach(([fieldName, collection]) => {
			collection.updateSource(this._source[fieldName]);
		});
		// TODO: still needed?
		// setTimeout(() => this.render());
		this._safePrepareData();
	}

	/**
	 * Return a reference to the parent Collection instance that contains this Document.
	 * @this {PseudoDocument}
	 * @returns {Collection|null}
	 */
	get collection() {
		return this.parent?.[this.parentCollection];
	}

	/** @override */
	get compendium() {
		return this.parentFoundryDocument?.compendium ?? null;
	}

	/* -------------------------------------------- */

	/**
	 * Is this document in a compendium? A stricter check than Document#inCompendium.
	 * @type {boolean}
	 * @override
	 */
	get inCompendium() {
		return this.parentFoundryDocument?.inCompendium ?? false;
	}

	/**
	 * Is this PseudoDocument persisted?
	 *
	 * A PseudoDocument is persisted if its parent Document is persisted.
	 * @type {boolean}
	 */
	get persisted() {
		return this.parentFoundryDocument?.persisted === true;
	}

	/**
	 * A boolean indicator for whether the current game User has ownership rights for this Document.
	 * Different Document types may have more specialized rules for what constitutes ownership.
	 * @type {boolean}
	 * @memberof ClientDocumentMixin#
	 */
	get isOwner() {
		return this.testUserPermission(game.user, 'OWNER');
	}

	/**
	 * Test whether this Document is owned by any non-Gamemaster User.
	 * @type {boolean}
	 */
	get hasPlayerOwner() {
		return game.users.some((u) => !u.isGM && this.testUserPermission(u, 'OWNER'));
	}

	/* ---------------------------------------- */

	/**
	 * A boolean indicator for whether the current game User has exactly LIMITED visibility (and no greater).
	 * @type {boolean}
	 */
	get limited() {
		return this.testUserPermission(game.user, 'LIMITED', { exact: true });
	}

	/**
	 * Return a string which creates a dynamic link to this Document instance.
	 * @returns {string}
	 */
	get link() {
		return `@UUID[${this.uuid}]{${foundry.utils.escapeHTML(this.name)}}`;
	}

	/**
	 * Return the permission level that the current game User has over this Document.
	 * See the {@link CONST.DOCUMENT_OWNERSHIP_LEVELS} object for an enumeration of these levels.
	 * @type {DocumentOwnershipNumber}
	 *
	 * @example Get the permission level the current user has for a document
	 * ```js
	 * game.user.id; // "dkasjkkj23kjf"
	 * actor.ownership; // {default: 1, dkasjkkj23kjf: 2}
	 * actor.permission; // 2
	 * ```
	 */
	get permission() {
		if (game.user.isGM) return CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
		return this.parentFoundryDocument.permission;
	}

	get sheet() {
		if (!this._sheet) {
			const cls = this._getSheetClass();

			// Application V1 Document Sheets
			if (foundry.utils.isSubclass(cls, foundry.appv1.api.Application)) {
				this._sheet = new cls(this, { editable: this.isOwner });
			}

			// Application V2 Document Sheets
			else if (foundry.utils.isSubclass(cls, foundry.applications.api.DocumentSheetV2)) {
				this._sheet = new cls({ document: this });
			}

			// No valid sheet class
			else {
				this._sheet = null;
			}
		}
		return this._sheet;
	}

	/**
	 * A boolean indicator for whether the current game User has at least limited visibility for this Document.
	 * Different Document types may have more specialized rules for what determines visibility.
	 * @type {boolean}
	 */
	get visible() {
		if (this.parent && !this.parent.visible) return false;
		return this.testUserPermission(game.user, 'LIMITED');
	}

	/**
	 * Obtain the FormApplication class constructor which should be used to configure this Document.
	 * @returns {Function|null}
	 * @private
	 */
	_getSheetClass() {
		const cfg = CONFIG[this.documentName];
		const type = this.type ?? CONST.BASE_DOCUMENT_TYPE;
		const sheets = cfg.sheetClasses[type] || {};

		// Sheet selection overridden at the instance level
		const override = this.getFlag('core', 'sheetClass') ?? null;
		if (override !== null && override in sheets) return sheets[override].cls;

		// Default sheet selection for the type
		const classes = Object.values(sheets);
		// it's a foundry global
		// eslint-disable-next-line no-undef
		if (!classes.length) return BaseSheet;
		return (classes.find((s) => s.default) ?? classes.pop()).cls;
	}

	/**
	 * Safely prepare data for a Document, catching any errors.
	 * @internal
	 */
	_safePrepareData() {
		try {
			this.prepareData();
		} catch (err) {
			Hooks.onError('PseudoDocument#prepareData', err, {
				msg: `Failed data preparation for ${this.uuid}`,
				log: 'error',
				uuid: this.uuid,
			});
		}
	}

	/**
	 * Prepare data for the Document. This method is called automatically by the DataModel#_initialize workflow.
	 * This method provides an opportunity for Document classes to define special data preparation logic.
	 * The work done by this method should be idempotent. There are situations in which prepareData may be called more
	 * than once.
	 * @memberof PseudoDocument#
	 */
	prepareData() {
		const isTypeData = this.system instanceof foundry.abstract.TypeDataModel;
		if (isTypeData) this.system.prepareBaseData();
		this.prepareBaseData();
		this.prepareEmbeddedDocuments();
		if (isTypeData) this.system.prepareDerivedData();
		this.prepareDerivedData();
	}

	/* -------------------------------------------- */

	/**
	 * Prepare data related to this Document itself, before any embedded Documents or derived data is computed.
	 * @memberof PseudoDocument#
	 */
	prepareBaseData() {}

	/* -------------------------------------------- */

	/**
	 * Prepare all embedded Document instances which exist within this primary Document.
	 * @memberof PseudoDocument#
	 */
	prepareEmbeddedDocuments() {
		for (const collectionName of Object.keys(this.collections || {})) {
			for (let e of this.collections[collectionName]) {
				e._safePrepareData();
			}
		}
		for (const collectionName of Object.keys(this.nestedCollections || {})) {
			for (let e of this.nestedCollections[collectionName]) {
				e._safePrepareData();
			}
		}
	}

	/* -------------------------------------------- */

	/**
	 * Apply transformations or derivations to the values of the source data object.
	 * Compute data fields whose values are not stored to the database.
	 * @memberof PseudoDocument#
	 */
	prepareDerivedData() {}

	/**
	 * Render all Application instances which are connected to this document by calling their respective
	 * @see Application#render
	 * @param {boolean} [force=false]     Force rendering
	 * @param {object} [context={}]       Optional context
	 * @memberof ClientDocumentMixin#
	 */
	render(force = false, context = {}) {
		for (let app of Object.values(this.apps)) {
			app.render(force, foundry.utils.deepClone(context));
		}
	}

	/**
	 * Determine the sort order for this Document by positioning it relative a target sibling.
	 * See SortingHelper.performIntegerSort for more details
	 * @param {object} [options]            Sorting options provided to SortingHelper.performIntegerSort
	 * @param {object} [options.updateData] Additional data changes applied to each sorted document
	 * @param {object} [options.sortOptions] Options passed to the foundry.utils.performIntegerSort method
	 * @returns {Promise<Document>}       The Document after it has been re-sorted
	 */
	async sortRelative({ updateData = {}, ...sortOptions } = {}) {
		const sorting = foundry.utils.performIntegerSort(this, sortOptions);
		const updates = [];
		for (const s of sorting) {
			const doc = s.target;
			const update = foundry.utils.mergeObject(updateData, s.update, { inplace: false });
			update._id = doc._id;
			if (doc.sheet && doc.sheet.rendered) await doc.sheet.submit({ updateData: update });
			else updates.push(update);
		}
		if (updates.length) await this.constructor.updateDocuments(updates, { parent: this.parent, pack: this.pack });
		return this;
	}

	/**
	 * Create a content link for this document.
	 * @param {object} eventData                     The parsed object of data provided by the drop transfer event.
	 * @param {object} [options]                     Additional options to configure link generation.
	 * @param {ClientDocument} [options.relativeTo]  A document to generate a link relative to.
	 * @param {string} [options.label]               A custom label to use instead of the document's name.
	 * @returns {string}
	 * @internal
	 */
	_createDocumentLink(eventData, { relativeTo, label } = {}) {
		if (!relativeTo && !label) return this.link;
		label ??= foundry.utils.escapeHTML(this.name);
		if (relativeTo) return `@UUID[${foundry.utils.buildRelativeUuid(this, relativeTo)}]{${label}}`;
		return `@UUID[${this.uuid}]{${label}}`;
	}

	/**
	 * Handle clicking on a content link for this document.
	 * @param {MouseEvent} event    The triggering click event.
	 * @returns {any}
	 * @protected
	 */
	_onClickDocumentLink(event) {
		return this.sheet.render(true);
	}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			return this.system._preCreate(data, options, user);
		}
	}

	/** @inheritDoc */
	_onCreate(data, options, userId) {
		super._onCreate(data, options, userId);

		// Update support metadata
		game.issues._countDocumentSubType(this.constructor, this._source);

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			this.system._onCreate(data, options, userId);
		}
	}

	/** @override */
	static async _onCreateOperation(documents, operation, user) {
		// Render the sheet for each created document
		if (!operation.renderSheet || user.id !== game.user.id) return;
		for (const [i, document] of documents.entries()) {
			document.sheet?.render(true, {
				renderContext: `create${this.documentName}`,
				renderData: operation.data[i],
			});
		}
	}

	/** @inheritDoc */
	async _preUpdate(changes, options, user) {
		const allowed = await super._preUpdate(changes, options, user);
		if (allowed === false) return false;

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			return this.system._preUpdate(changes, options, user);
		}
	}

	/** @inheritDoc */
	_onUpdate(changed, options, userId) {
		super._onUpdate(changed, options, userId);

		// Clear cached sheet if a new sheet is chosen, or the Document's sub-type changes.
		const sheetChanged = 'type' in changed || 'sheetClass' in (changed.flags?.core || {});
		if (!options.preview && sheetChanged) this._onSheetChange();
		// Otherwise re-render associated applications.
		else if (options.render !== false) {
			const options = {
				renderContext: `update${this.documentName}`,
				renderData: changed,
			};
			this.render(false, options);
		}

		// Update Compendium and global indices
		if (this.inCompendium && !this.isEmbedded) {
			if (this instanceof foundry.documents.Folder) this.collection.folders.set(this.id, this);
			else this.collection.indexDocument(this);
		}
		if ('name' in changed) game.documentIndex.replaceDocument(this);

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			this.system._onUpdate(changed, options, userId);
		}
	}

	/** @inheritDoc */
	async _preDelete(options, user) {
		const allowed = await super._preDelete(options, user);
		if (allowed === false) return false;

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			return this.system._preDelete(options, user);
		}
	}

	/** @inheritDoc */
	_onDelete(options, userId) {
		super._onDelete(options, userId);
		this.#closeApplications(this);

		// Update support metadata
		game.issues._countDocumentSubType(this.constructor, this._source, { decrement: true });

		// Forward to type data model
		if (this.system instanceof foundry.abstract.TypeDataModel) {
			this.system._onDelete(options, userId);
		}
	}

	/**
	 * Close open Applications for this Document and its children.
	 * @param {ClientDocument} document
	 * @param {object} [closingOptions]
	 */
	#closeApplications(document, closingOptions) {
		closingOptions ??= {
			submit: false,
			renderContext: `delete${this.documentName}`,
			renderData: this,
		};
		Object.values(document.apps).forEach((a) => a.close(closingOptions));
		for (const collection of Object.values(document.collections)) {
			for (const child of collection) {
				this.#closeApplications(child, closingOptions);
			}
		}
		for (const collection of Object.values(document.nestedCollections)) {
			for (const child of collection) {
				this.#closeApplications(child, closingOptions);
			}
		}
	}

	/**
	 * Orchestrate dispatching descendant document events to parent documents when embedded children are modified.
	 * @param {string} event                The event name, preCreate, onCreate, etc...
	 * @param {string} collection           The collection name being modified within this parent document
	 * @param {Array<*>} args               Arguments passed to each dispatched function
	 * @param {ClientDocument} [_parent]    The document with directly modified embedded documents.
	 *                                      Either this document or a descendant of this one.
	 * @internal
	 */
	_dispatchDescendantDocumentEvents(event, collection, args, _parent) {
		_parent ||= this;

		// Dispatch the event to this Document
		const fn = this[`_${event}DescendantDocuments`];
		if (typeof fn !== 'function') throw new Error(`Invalid descendant document event "${event}"`);
		fn.call(this, _parent, collection, ...args);

		// Bubble the event to the parent Document
		/** @type ClientDocument */
		const parent = this.parentDocument;
		if (!parent) return;
		parent._dispatchDescendantDocumentEvents(event, collection, args, _parent);
	}

	/**
	 * Actions taken after descendant documents have been created, but before changes are applied to the client data.
	 * @param {Document} parent         The direct parent of the created Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents are being created
	 * @param {object[]} data           The source data for new documents that are being created
	 * @param {object} options          Options which modified the creation operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_preCreateDescendantDocuments(parent, collection, data, options, userId) {}

	/* -------------------------------------------- */

	/**
	 * Actions taken after descendant documents have been created and changes have been applied to client data.
	 * @param {Document} parent         The direct parent of the created Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents were created
	 * @param {Document[]} documents    The array of created Documents
	 * @param {object[]} data           The source data for new documents that were created
	 * @param {object} options          Options which modified the creation operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
		if (options.render === false) return;
		this.render(false, { renderContext: `create${collection}`, renderData: data });
	}

	/* -------------------------------------------- */

	/**
	 * Actions taken after descendant documents have been updated, but before changes are applied to the client data.
	 * @param {Document} parent         The direct parent of the updated Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents are being updated
	 * @param {object[]} changes        The array of differential Document updates to be applied
	 * @param {object} options          Options which modified the update operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_preUpdateDescendantDocuments(parent, collection, changes, options, userId) {}

	/* -------------------------------------------- */

	/**
	 * Actions taken after descendant documents have been updated and changes have been applied to client data.
	 * @param {Document} parent         The direct parent of the updated Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents were updated
	 * @param {Document[]} documents    The array of updated Documents
	 * @param {object[]} changes        The array of differential Document updates which were applied
	 * @param {object} options          Options which modified the update operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
		if (options.render === false) return;
		this.render(false, { renderContext: `update${collection}`, renderData: changes });
	}

	/* -------------------------------------------- */

	/**
	 * Actions taken after descendant documents have been deleted, but before deletions are applied to the client data.
	 * @param {Document} parent         The direct parent of the deleted Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents were deleted
	 * @param {string[]} ids            The array of document IDs which were deleted
	 * @param {object} options          Options which modified the deletion operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_preDeleteDescendantDocuments(parent, collection, ids, options, userId) {}

	/* -------------------------------------------- */

	/**
	 * Actions taken after descendant documents have been deleted and those deletions have been applied to client data.
	 * @param {Document} parent         The direct parent of the deleted Documents, may be this Document or a child
	 * @param {string} collection       The collection within which documents were deleted
	 * @param {Document[]} documents    The array of Documents which were deleted
	 * @param {string[]} ids            The array of document IDs which were deleted
	 * @param {object} options          Options which modified the deletion operation
	 * @param {string} userId           The ID of the User who triggered the operation
	 * @protected
	 */
	_onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
		if (options.render === false) return;
		this.render(false, { renderContext: `delete${collection}`, renderData: ids });
	}

	/**
	 * Whenever the Document's sheet changes, close any existing applications for this Document, and re-render the new
	 * sheet if one was already open.
	 * @param {object} [options]
	 * @param {boolean} [options.sheetOpen]  Whether the sheet was originally open and needs to be re-opened.
	 * @internal
	 */
	async _onSheetChange({ sheetOpen } = {}) {
		sheetOpen ??= this.sheet.rendered;
		await Promise.all(Object.values(this.apps).map((app) => app.close()));
		this._sheet = null;
		if (sheetOpen) this.sheet.render(true);

		// Re-draw the parent sheet in case of a dependency on the child sheet.
		this.parent?.sheet?.render(false);
	}

	/**
	 * Gets the default new name for a Document
	 * @param {object} context                    The context for which to create the Document name.
	 * @param {string} [context.type]             The sub-type of the document
	 * @param {Document|null} [context.parent]    A parent document within which the created Document should belong
	 * @param {string|null} [context.pack]        A compendium pack within which the Document should be created
	 * @returns {string}
	 */
	static defaultName({ type, parent, pack } = {}) {
		const documentName = this.documentName;
		let baseNameKey = this.metadata.label;
		if (type && this.hasTypeData) {
			const typeNameKey = CONFIG[documentName].typeLabels?.[type];
			if (typeNameKey && game.i18n.has(typeNameKey)) baseNameKey = typeNameKey;
		}
		return game.i18n.localize(baseNameKey);
	}

	/**
	 * Present a Dialog form to create a new Document of this type.
	 * Choose a name and a type from a select menu of types.
	 * @param {object} data                Document creation data
	 * @param {DatabaseCreateOperation} [createOptions]  Document creation options.
	 * @param {object} [options={}]        Options forwarded to DialogV2.prompt
	 * @param {{id: string; name: string}[]} [options.folders] Available folders in which the new Document can be place
	 * @param {string[]} [options.types]   A restriction of the selectable sub-types of the Dialog.
	 * @param {string} [options.template]  A template to use for the dialog contents instead of the default.
	 * @param {object} [options.context]   Additional render context to provide to the template.
	 * @param {ApplicationRenderOptions} [renderOptions]  Options to forward to the document sheet's render call.
	 * @returns {Promise<Document|null>}   A Promise which resolves to the created Document, or null if the dialog was
	 *                                     closed.
	 */
	static async createDialog(data = {}, createOptions = {}, { folders, types, template, context, ...dialogOptions } = {}, renderOptions = {}) {
		return null;
	}

	/**
	 * Present a Dialog form to confirm deletion of this Document.
	 * @param {object} [options] Additional options passed to `DialogV2.confirm`
	 * @param {DatabaseDeleteOperation} [operation]  Document deletion options.
	 * @returns {Promise<Document>} A Promise that resolves to the deleted Document
	 */
	async deleteDialog(options = {}, operation = {}) {
		const positionKeys = ['top', 'left', 'width', 'height', 'scale', 'zIndex'];
		if (positionKeys.some((k) => k in options)) {
			foundry.utils.logCompatibilityWarning('options is now an object containing entries supported by DialogV2.confirm.', { since: 13, until: 15 });
			options.position = positionKeys.reduce((position, key) => {
				if (options[key] !== undefined) position[key] = options[key];
				delete options[key];
				return position;
			}, {});
		}
		let content = options.content;
		const type = game.i18n.localize(this.constructor.metadata.label);
		if (!content) {
			const question = game.i18n.localize('COMMON.AreYouSure');
			const warning = game.i18n.localize('SIDEBAR.DeleteWarning', { type });
			content = `<p><strong>${question}</strong> ${warning}</p>`;
		}
		return foundry.applications.api.DialogV2.confirm(
			foundry.utils.mergeObject(
				{
					content,
					yes: { callback: () => this.delete(operation) },
					window: {
						icon: 'fa-solid fa-trash',
						title: `${game.i18n.localize('DOCUMENT.Delete', { type })}: ${this.name}`,
					},
				},
				options,
			),
		);
	}

	/**
	 * Export document data to a JSON file which can be saved by the client and later imported into a different session.
	 * Only world Documents may be exported.
	 * @param {object} [options]      Additional options passed to the {@link ClientDocument#toCompendium} method
	 */
	exportToJSON(options = {}) {
		throw new Error('Only world Documents may be exported');
	}

	/**
	 * Serialize salient information about this Document when dragging it.
	 * @returns {object}  An object of drag data.
	 */
	toDragData() {
		const dragData = { type: this.documentName };
		if (this.id) dragData.uuid = this.uuid;
		else dragData.data = this.toObject();
		return dragData;
	}

	/**
	 * A helper function to handle obtaining the relevant Document from dropped data provided via a DataTransfer event.
	 * The dropped data could have:
	 * 1. A data object explicitly provided
	 * 2. A UUID
	 *
	 * @param {object} data           The data object extracted from a DataTransfer event
	 * @returns {Promise<Document>}   The resolved Document
	 * @throws If a Document could not be retrieved from the provided data.
	 */
	static async fromDropData(data) {
		let document = null;

		// Case 1 - Data explicitly provided
		if (data.data) document = new this(data.data);
		// Case 2 - UUID provided
		else if (data.uuid) document = await foundry.utils.fromUuid(data.uuid);

		// Ensure that we retrieved a valid document
		if (!document) {
			throw new Error('Failed to resolve Document from provided DragData. Either data or a UUID must be provided.');
		}
		if (document.documentName !== this.documentName) {
			throw new Error(`Invalid Document type '${document.type}' provided to ${this.name}.fromDropData.`);
		}

		// Flag the source UUID
		const { _stats: stats, uuid, compendium } = document;
		if (stats && uuid) {
			if (!stats.compendiumSource && compendium) {
				document.updateSource({ '_stats.compendiumSource': uuid });
			} else if (!stats.duplicateSource && !compendium) {
				document.updateSource({ '_stats.duplicateSource': uuid });
			}
		}
		return document;
	}

	/**
	 * Create the Document from the given source with migration applied to it.
	 * Only primary Documents may be imported.
	 *
	 * This function must be used to create a document from data that predates the current core version.
	 * It must be given nonpartial data matching the schema it had in the core version it is coming from.
	 * It applies legacy migrations to the source data before calling {@link foundry.abstract.Document.fromSource}.
	 * If this function is not used to import old data, necessary migrations may not applied to the data
	 * resulting in an incorrectly imported document.
	 *
	 * The core version is recorded in the `_stats` field, which all primary documents have. If the given source data
	 * doesn't contain a `_stats` field, the data is assumed to be pre-V10, when the `_stats` field didn't exist yet.
	 * The `_stats` field must not be stripped from the data before it is exported!
	 * @param {object} source                  The document data that is imported.
	 * @param {DocumentConstructionContext} [context] The model construction context passed to
	 *                                                {@link foundry.abstract.Document.fromSource}. Strict validation is
	 *                                                enabled by default.
	 * @returns {Promise<Document>}
	 */
	static async fromImport(source, context) {
		throw new Error('Only primary Documents may be imported');
	}

	/**
	 * Update this Document using a provided JSON string.
	 * Only world Documents may be imported.
	 * @this {ClientDocument}
	 * @param {string} json                 Raw JSON data to import
	 * @returns {Promise<ClientDocument>}   The updated Document instance
	 */
	async importFromJSON(json) {
		throw new Error('Only world Documents may be imported');
	}

	/**
	 * Render an import dialog for updating the data related to this Document through an exported JSON file
	 * @returns {Promise<void>}
	 */
	async importFromJSONDialog() {}

	/**
	 * Transform the Document data to be stored in a Compendium pack.
	 * Remove any features of the data which are world-specific.
	 * @param {CompendiumCollection} [pack]   A specific pack being exported to
	 * @param {ToCompendiumOptions} [options] Additional options which modify how the document is converted
	 * @returns {object}                      A data object of cleaned data suitable for compendium import
	 */
	toCompendium(pack, { clearSort = true, clearFolder = false, clearFlags = false, clearSource = true, clearOwnership = true, clearState = true, keepId = false } = {}) {
		const data = this.toObject();
		const fieldsToClearRecursively = [];
		if (!keepId) delete data._id;
		if (clearSort) delete data.sort;
		if (clearFolder) delete data.folder;
		if (clearFlags) delete data.flags;
		if (clearSource) fieldsToClearRecursively.push('_stats.compendiumSource', '_stats.duplicateSource', '_stats.exportSource');
		if (clearOwnership) fieldsToClearRecursively.push('author');
		if (clearState) delete data.active;
		this.constructor._clearFieldsRecursively(data, fieldsToClearRecursively);
		if (clearOwnership)
			this.constructor._clearFieldsRecursively(data, ['ownership'], {
				callback: (data) => {
					if (!('ownership' in data)) return;
					const defaultOwnership = foundry.utils.getProperty(data, 'ownership.default');
					foundry.utils.deleteProperty(data, 'ownership');
					if (typeof defaultOwnership === 'number') data.ownership = { default: defaultOwnership };
				},
			});
		return data;
	}

	/**
	 * Create a content link for this Document.
	 * @param {Partial<EnrichmentAnchorOptions>} [options]  Additional options to configure how the link is constructed.
	 * @returns {HTMLAnchorElement}
	 */
	toAnchor({ attrs = {}, dataset = {}, classes = [], name, icon } = {}) {
		// Build dataset
		const documentConfig = CONFIG[this.documentName];
		const documentName = game.i18n.localize(`DOCUMENT.${this.documentName}`);
		let anchorIcon = icon ?? documentConfig.sidebarIcon;
		if (!classes.includes('content-link')) classes.unshift('content-link');
		attrs = foundry.utils.mergeObject({ draggable: 'true' }, attrs);
		dataset = foundry.utils.mergeObject(
			{
				link: '',
				uuid: this.uuid,
				id: this.id,
				type: this.documentName,
				pack: this.pack,
				tooltip: documentName,
			},
			dataset,
		);

		// If this is a typed document, add the type to the dataset
		if (this.type) {
			const typeLabel = documentConfig.typeLabels[this.type];
			const typeName = game.i18n.has(typeLabel) ? `${game.i18n.localize(typeLabel)}` : '';
			attrs['aria-label'] ??= typeName ? game.i18n.localize('DOCUMENT.TypePageFormat', { type: typeName, page: documentName }) : documentName;
			dataset.tooltip = '';
			anchorIcon = icon ?? documentConfig.typeIcons?.[this.type] ?? documentConfig.sidebarIcon;
		}

		name ??= this.name;
		return TextEditor.implementation.createAnchor({ attrs, dataset, name, classes, icon: anchorIcon });
	}

	/**
	 * Convert a Document to some HTML display for embedding purposes.
	 * @param {DocumentHTMLEmbedConfig} config  Configuration for embedding behavior.
	 * @param {EnrichmentOptions} [options]     The original enrichment options for cases where the Document embed
	 *                                          content also contains text that must be enriched.
	 * @returns {Promise<HTMLDocumentEmbedElement|HTMLElement|null>} A representation of the Document as HTML content,
	 *                                          or null if such a representation could not be generated.
	 */
	async toEmbed(config, options = {}) {
		let content = await this._buildEmbedHTML(config, options);
		for (const handler of CONFIG[this.documentName].embedHandlers ?? []) {
			content = await handler(this, content, config, options);
		}
		if (!content) return null;

		// Structure the embed as inline or figure unless it is already explicitly a <document-embed> element
		const embedCls = foundry.applications.elements.HTMLDocumentEmbedElement;
		let embed;
		if (foundry.utils.isElementInstanceOf(content, embedCls)) embed = content;
		else {
			if (config.inline) embed = await this._createInlineEmbed(content, config, options);
			else embed = await this._createFigureEmbed(content, config, options);
		}

		// Attach required attributes
		if (embed) {
			embed.setAttribute('uuid', this.uuid);
			embed.dataset.uuid = this.uuid;
			embed.dataset.contentEmbed = '';
			if (config.classes) embed.classList.add(...config.classes.split(' '));
		}
		return embed;
	}

	/**
	 * Specific callback actions to take when the embedded HTML for this Document has been added to the DOM.
	 * @param {HTMLDocumentEmbedElement} element      The embedded document HTML
	 */
	onEmbed(element) {
		if (this.system instanceof foundry.abstract.TypeDataModel) this.system.onEmbed(element);
	}

	/**
	 * A method that can be overridden by subclasses to customize embedded HTML generation.
	 * @param {DocumentHTMLEmbedConfig} config  Configuration for embedding behavior.
	 * @param {EnrichmentOptions} [options]     The original enrichment options for cases where the Document embed
	 *                                          content also contains text that must be enriched.
	 * @returns {Promise<HTMLElement|HTMLCollection|null>}  Either a single root element to append, or a collection of
	 *                                                      elements that comprise the embedded content.
	 * @protected
	 */
	async _buildEmbedHTML(config, options = {}) {
		return this.system instanceof foundry.abstract.TypeDataModel ? this.system.toEmbed(config, options) : null;
	}

	/**
	 * A method that can be overridden by subclasses to customize inline embedded HTML generation.
	 * @param {HTMLElement|HTMLCollection} content  The embedded content.
	 * @param {DocumentHTMLEmbedConfig} [config]    Configuration for embedding behavior.
	 * @param {EnrichmentOptions} [options]         The original enrichment options for cases where the Document embed
	 *                                              content also contains text that must be enriched.
	 * @returns {Promise<HTMLElement|null>}
	 * @protected
	 */
	async _createInlineEmbed(content, config, options) {
		const embed = new foundry.applications.elements.HTMLDocumentEmbedElement();
		if (content instanceof HTMLCollection) embed.append(...content);
		else embed.append(content);
		return embed;
	}

	/**
	 * A method that can be overridden by subclasses to customize the generation of the embed figure.
	 * @param {HTMLElement|HTMLCollection} content  The embedded content.
	 * @param {DocumentHTMLEmbedConfig} config      Configuration for embedding behavior.
	 * @param {EnrichmentOptions} [options]         The original enrichment options for cases where the Document embed
	 *                                              content also contains text that must be enriched.
	 * @returns {Promise<HTMLElement|null>}
	 * @protected
	 */
	async _createFigureEmbed(content, { cite, caption, captionPosition = 'bottom', label }, options) {
		const figure = document.createElement('figure');
		if (content instanceof HTMLCollection) figure.append(...content);
		else figure.append(content);
		if (cite || caption) {
			const figcaption = document.createElement('figcaption');
			if (caption) {
				const el = document.createElement('strong');
				el.classList.add('embed-caption');
				el.append(label || this.name);
				figcaption.append(el);
			}
			if (cite) {
				const el = document.createElement('cite');
				el.append(this.toAnchor());
				figcaption.append(el);
			}
			figure.insertAdjacentElement(captionPosition === 'bottom' ? 'beforeend' : 'afterbegin', figcaption);
			if (captionPosition === 'top' && cite) figure.append(figcaption.querySelector(':scope > cite'));
		}
		figure.classList.add('content-embed'); // For backwards compatibility
		return this._createInlineEmbed(figure);
	}

	/**
	 * @deprecated since v14
	 * @ignore
	 */
	getRelativeUUID(relative) {
		foundry.utils.logCompatibilityWarning('ClientDocument#getRelativeUUID has been deprecated in favor of foundry.utils.buildRelativeUuid', { since: 14, until: 16, once: true });
		return foundry.utils.buildRelativeUuid(this.uuid, relative);
	}

	// --------------------------------
	// Actual PseudoDocument methods
	// --------------------------------

	/**
	 * @return {Actor|null}
	 */
	get actor() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof Actor) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	/**
	 * @return {Item|null}
	 */
	get item() {
		let current = this.parent;
		while (current !== null) {
			if (current instanceof Item) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	get isPseudoDocument() {
		return true;
	}

	/* -------------------------------------------- */
}
