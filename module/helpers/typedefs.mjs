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
 * @abstract
 * @typedef Document An extension of the base DataModel which defines a Document. Documents are special in that
 * they are persisted to the database and referenced by _id.
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
 * @typedef ApplicationTab
 * @property {string} id         The ID of the tab. Unique per group.
 * @property {string} group      The group this tab belongs to.
 * @property {string} icon       An icon to prepend to the tab
 * @property {string} label      Display text, will be run through `game.i18n.localize`
 * @property {boolean} active    If this is the active tab, set with `this.tabGroups[group] === id`
 * @property {string} cssClass   "active" or "" based on the above boolean
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
