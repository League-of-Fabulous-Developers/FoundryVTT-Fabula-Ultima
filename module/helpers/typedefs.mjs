// Place common/shared defs here to avoid circular

/**
 * @typedef BaseDamageInfo
 * @prop {number} total
 * @prop {import("./config.mjs").DamageType} type
 * @prop {number} modifierTotal
 * @property {String} extra
 */

export {};

/**
 * An extension of the base DataModel which defines a Document.
 * Documents are special in that they are persisted to the database and referenced by _id.
 * @abstract
 * @typedef Document
 * @template {object} [DocumentData=object] Initial data from which to construct the Document
 * @template {DocumentConstructionContext} [DocumentContext=DocumentConstructionContext] Construction context options
 *
 * @property {string|null} _id                    The document identifier, unique within its Collection, or null if the
 *                                                Document has not yet been assigned an identifier
 * @property {string} [name]                      Documents typically have a human-readable name
 * @property {DataModel} [system]                 Certain document types may have a system data model which contains
 *                                                subtype-specific data defined by the game system or a module
 * @property {DocumentStats} [_stats]             Primary document types have a _stats object which provides metadata
 *                                                about their status
 * @property {DocumentFlags} flags                Documents each have an object of arbitrary flags which are used by
 *                                                systems or modules to store additional Document-specific data
 * @extends {DataModel<DocumentData, DocumentContext>}
 */

// TODO: Figure out how to remove warnings
/**
 * @global
 * @async
 * @function fromUuid
 * @description Retrieve a Document by its Universally Unique Identifier (uuid).
 * @param {string} uuid                      The uuid of the Document to retrieve.
 * @param {object} [options]                 Options to configure how a UUID is resolved.
 * @param {Document} [options.relative]      A Document to resolve relative UUIDs against.
 * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Document.
 * @returns {Promise<Document|null>}         Returns the Document if it could be found, otherwise null.
 **/

/**
 * @global
 * @async
 * @function fromUuidSync
 * @param {string} uuid                      The uuid of the Document to retrieve.
 * @param {object} [options]                 Options to configure how a UUID is resolved.
 * @param {Document} [options.relative]      A Document to resolve relative UUIDs against.
 * @param {boolean} [options.invalid=false]  Allow retrieving an invalid Document.
 * @param {boolean} [options.strict=true]    Throw an error if the UUID cannot be resolved synchronously.
 * @returns {Document|object|null}           The Document or its index entry if it resides in a Compendium, otherwise
 *                                           null.
 * @throws If the uuid resolves to a Document that cannot be retrieved synchronously, and the strict option is true.
 **/

// [APPLICATION]

/**
 * @typedef {Object} HandlebarsTemplatePart
 * @property {string} template                      The template entry-point for the part
 * @property {string} [id]                          A CSS id to assign to the top-level element of the rendered part.
 *                                                  This id string is automatically prefixed by the application id.
 * @property {string[]} [classes]                   An array of CSS classes to apply to the top-level element of the
 *                                                  rendered part.
 * @property {string[]} [templates]                 An array of templates that are required to render the part.
 *                                                  If omitted, only the entry-point is inferred as required.
 * @property {string[]} [scrollable]                An array of selectors within this part whose scroll positions should
 *                                                  be persisted during a re-render operation. A blank string is used
 *                                                  to denote that the root level of the part is scrollable.
 * @property {Record<string, ApplicationFormConfiguration>} [forms]  A registry of forms selectors and submission handlers.
 */

/**
 * @typedef HandlebarsRenderOptions
 * @property {string[]} parts                       An array of named template parts to render
 */

/**
 * @typedef ApplicationTabsConfiguration
 * @property {{id: string; icon?: string; label?: string; tooltip?: string}[]} tabs An array of tab configuration data
 * @property {string} [initial]     The tab in this group that will be active on first render
 * @property {string} [labelPrefix] A localization path prefix for all tabs in the group: if set, a label is generated
 *                                  for each tab using a full path of `${labelPrefix}.${tabId}`.
 */

/**
 * @typedef ApplicationTab
 * @property {string} id         The ID of the tab. Unique per group.
 * @property {string} group      The group this tab belongs to.
 * @property {string} icon       An icon to prepend to the tab
 * @property {string} label      Display text, will be run through `game.i18n.localize`
 * @property {boolean} active    If this is the active tab, set with `this.tabGroups[group] === id`
 * @property {string} cssClass   "active" or "" based on the above boolean
 */

/**
 * @typedef TabsConfiguration
 * @property {string} [group]            The name of the tabs group
 * @property {string} navSelector        The CSS selector used to target the navigation element for these tabs
 * @property {string} contentSelector    The CSS selector used to target the content container for these tabs
 * @property {string} initial            The tab name of the initially active tab
 * @property {Function|null} [callback]  An optional callback function that executes when the active tab is changed
 * @example
 * const tabs = new foundry.applications.ux.Tabs(...);
 * tabs.bind(html);
 */

/**
 * @typedef ApplicationRenderContext   Context data provided to the renderer
 * @property {Record<string, ApplicationTab>} [tabs]    Tab data prepared from an entry in
 *   {@link foundry.applications.api.ApplicationV2.TABS}
 */

/**
 * @typedef ApplicationWindowConfiguration
 * @property {boolean} [frame=true]             Is this Application rendered inside a window frame?
 * @property {boolean} [positioned=true]        Can this Application be positioned via JavaScript or only by CSS
 * @property {string} [title]                   The window title. Displayed only if the application is framed
 * @property {string|false} [icon]              An optional Font Awesome icon class displayed left of the window title
 * @property {ApplicationHeaderControlsEntry[]} [controls]  An array of window control entries
 * @property {boolean} [minimizable=true]       Can the window app be minimized by double-clicking on the title
 * @property {boolean} [resizable=false]        Is this window resizable?
 * @property {string} [contentTag="section"]    A specific tag name to use for the .window-content element
 * @property {string[]} [contentClasses]        Additional CSS classes to apply to the .window-content element
 */

/**
 * @typedef ApplicationHeaderControlsEntry
 * @property {string} icon                      A font-awesome icon class which denotes the control button
 * @property {string} label                     The text label for the control button. This label will be automatically
 *                                              localized when the button is rendered
 * @property {string} action                    The action name triggered by clicking the control button
 * @property {boolean|(() => boolean)} [visible] Is the control button visible for the current client?
 * @property {DocumentOwnershipLevel} [ownership] A key or value in {@link CONST.DOCUMENT_OWNERSHIP_LEVELS} that
 *                                                restricts visibility of this option for the current user. This option
 *                                                only applies to DocumentSheetV2 instances.
 * @property {(event: PointerEvent) => void|Promise<void>} [onClick] A custom click handler function. Asynchronous
 *                                                                   functions are not awaited.
 */

/**
 * @typedef ApplicationFormConfiguration
 * @property {ApplicationFormSubmission} handler
 * @property {boolean} submitOnChange
 * @property {boolean} closeOnSubmit
 */

/**
 * @typedef ApplicationConfiguration
 * @property {string} id                        An HTML element identifier used for this Application instance
 * @property {string} uniqueId                  An string discriminator substituted for {id} in the default
 *                                              HTML element identifier for the class
 * @property {string[]} classes                 An array of CSS classes to apply to the Application
 * @property {string} tag                       The HTMLElement tag type used for the outer Application frame
 * @property {ApplicationWindowConfiguration} window  Configuration of the window behaviors for this Application
 * @property {Record<string, ApplicationClickAction|{handler: ApplicationClickAction, buttons: number[]}>} actions
 *                                              Click actions supported by the Application and their event handler
 *                                              functions. A handler function can be defined directly which only
 *                                              responds to left-click events. Otherwise, an object can be declared
 *                                              containing both a handler function and an array of buttons which are
 *                                              matched against the PointerEvent#button property.
 * @property {ApplicationFormConfiguration} [form] Configuration used if the application top-level element is a form or
 *                                                 dialog
 * @property {Partial<ApplicationPosition>} position  Default positioning data for the application
 */

/**
 * @typedef ApplicationRenderOptions
 * @property {boolean} [force=false]            Force application rendering. If true, an application which does not
 *                                              yet exist in the DOM is added. If false, only applications which
 *                                              already exist are rendered.
 * @property {ApplicationPosition} [position]   A specific position at which to render the Application
 * @property {ApplicationWindowRenderOptions} [window]  Updates to the Application window frame
 * @property {string[]} [parts]                 Some Application classes, for example the HandlebarsApplication,
 *                                              support re-rendering a subset of application parts instead of the full
 *                                              Application HTML.
 * @property {boolean} [isFirstRender]          Is this render the first one for the application? This property is
 *                                              populated automatically.
 */

// [TEXT EDITOR ENRICHERS]

/**
 * @typedef EnrichmentOptions
 * @property {boolean} [secrets=false]      Include unrevealed secret tags in the final HTML? If false, unrevealed
 *                                          secret blocks will be removed.
 * @property {boolean} [documents=true]     Replace dynamic document links?
 * @property {boolean} [links=true]         Replace hyperlink content?
 * @property {boolean} [rolls=true]         Replace inline dice rolls?
 * @property {boolean} [embeds=true]        Replace embedded content?
 * @property {boolean} [custom=true]        Apply custom enrichers?
 * @property {object|Function} [rollData]   The data object providing context for inline rolls, or a function that
 *                                          produces it.
 * @property {ClientDocument} [relativeTo]  A document to resolve relative UUIDs against.
 */

/**
 * @callback TextEditorEnricher
 * @param {RegExpMatchArray} match          The regular expression match result
 * @param {EnrichmentOptions} [options]     Options provided to customize text enrichment
 * @returns {Promise<HTMLElement|null>}     An HTML element to insert in place of the matched text or null to
 *                                          indicate that no replacement should be made.
 */

/**
 * @typedef TextEditorEnricherConfig
 * @property {string} [id]                  A unique ID to assign to the enricher type. Required if you want to use
 *                                          the onRender callback.
 * @property {RegExp} pattern               The string pattern to match. Must be flagged as global.
 * @property {TextEditorEnricher} enricher  The function that will be called on each match. It is expected that this
 *                                          returns an HTML element to be inserted into the final enriched content.
 * @property {boolean} [replaceParent]      Hoist the replacement element out of its containing element if it replaces
 *                                          the entire contents of the element.
 * @property {function(HTMLEnrichedContentElement)} [onRender]  An optional callback that is invoked when the
 *                                          enriched content is added to the DOM.
 */

/**
 * @typedef HTMLEnrichedContentElement
 * @extends HTMLElement
 */

/**
 * An extension of the native FormData implementation.
 *
 * This class functions the same way that the default FormData does, but it is more opinionated about how
 * input fields of certain types should be evaluated and handled.
 *
 * It also adds support for certain Foundry VTT specific concepts including:
 *  Support for defined data types and type conversion
 *  Support for TinyMCE editors
 *  Support for editable HTML elements
 *
 * @typedef FormDataExtended
 * @param {HTMLFormElement} form          The form being processed
 * @param {object} options                Options which configure form processing
 * @param {Record<string, object>} [options.editors]      A record of TinyMCE editor metadata objects, indexed by their update key
 * @param {Record<string, string>} [options.dtypes]       A mapping of data types for form fields
 * @param {boolean} [options.disabled=false]      Include disabled fields?
 * @param {boolean} [options.readonly=false]      Include readonly fields?
 */

/**
 * The abstract base class which defines the data schema contained within a Document.
 * @typedef DataModel
 *
 */

/**
 * @typedef DataFieldOptions
 * @property {boolean} [required=false]   Is this field required to be populated?
 * @property {boolean} [nullable=false]   Can this field have null values?
 * @property {boolean} [gmOnly=false]     Can this field only be modified by a gamemaster or assistant gamemaster?
 * @property {Function|*} [initial]       The initial value of a field, or a function which assigns that initial value.
 * @property {string} [label]             A localizable label displayed on forms which render this field.
 * @property {string} [hint]              Localizable help text displayed on forms which render this field.
 * @property {DataFieldValidator} [validate] A custom data field validation function.
 * @property {string} [validationError]   A custom validation error string. When displayed will be prepended with the
 *                                        document name, field name, and candidate value. This error string is only
 *                                        used when the return type of the validate function is a boolean. If an Error
 *                                        is thrown in the validate function, the string message of that Error is used.
 */
