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
