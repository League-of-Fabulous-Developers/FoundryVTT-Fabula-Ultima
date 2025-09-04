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
 * @param {String|*} input
 * @returns {String}
 */
function capitalize(input) {
	return typeof input === 'string' ? input.charAt(0).toUpperCase() + input.slice(1).toLowerCase() : input;
}

/**
 * @description Truncate text at the last whole word and add an ellipsis if needed.
 * @param {String} text - The input text
 * @param {Number} maxLength - Maximum allowed length before truncation
 * @returns {String} - The truncated string with "…" if needed
 */
function truncate(text, maxLength) {
	if (typeof text !== 'string') return '';
	if (text.length <= maxLength) return text;

	// Cut down to maxLength
	let truncated = text.slice(0, maxLength);

	// Find last space before maxLength
	const lastSpace = truncated.lastIndexOf(' ');
	if (lastSpace > 0) {
		truncated = truncated.slice(0, lastSpace);
	}

	return truncated + '…';
}

export const StringUtils = Object.freeze({
	kebabToPascal,
	titleToKebab,
	localize,
	capitalize,
	truncate,
});
