// TODO: Export after cleaned up from config.mjs
/**
 * @description The system's id
 */
export const systemId = 'projectfu';

/**
 * @description Translates a relative path to a system handlebars template path
 * @param {string} path - A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export function systemTemplatePath(path) {
	return `systems/${systemId}/templates/${path}.hbs`;
}

/**
 * @param {String} type An identifier for a type
 * @returns {string} A system-prefixed unique identifier for the type
 */
export function prefixType(type) {
	return `${systemId}.${type}`;
}

/**
 * @description Translates a relative path to a system asset path
 * @param {string} path - A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export function systemAssetPath(path) {
	return `systems/${systemId}/styles/static/${path}`;
}
