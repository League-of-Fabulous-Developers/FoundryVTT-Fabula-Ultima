/**
 * @param {String} str
 * @returns {string}
 */
function kebabToPascal(str) {
	return str
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

/**
 * @param {String} str
 * @returns {string}
 */
function titleToKebab(str) {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/\s+/g, '-')
		.toLowerCase();
}

/**
 * @param {String} key
 * @param {Object} data
 * @returns {String}
 */
function localize(key, data = undefined) {
	if (data) {
		return game.i18n.format(key, data);
	}
	return game.i18n.localize(key);
}

/**
 * @param {String} word
 * @returns {String}
 */
function capitalize(word) {
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export const StringUtils = Object.freeze({
	kebabToPascal,
	titleToKebab,
	localize,
	capitalize,
});
