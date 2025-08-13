// TODO: Export after cleaned up from config.mjs
/**
 * @description The system's id
 */
const SYSTEM = 'projectfu';

/**
 * @description Translates a relative path to a system handlebars template path
 * @param {string} path - A path relative to the root of this repository
 * @returns {string} The path relative to the Foundry data folder
 */
export function systemTemplatePath(path) {
	return `systems/${SYSTEM}/templates/${path}.hbs`;
}
