// NOTE: This should have no dependencies

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
	if (typeof key === 'string') {
		return game.i18n.localize(key);
	}
	return key.toString();
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

/**
 * @param {Object} value
 * @returns {null|string}
 */
function toBase64(value) {
	try {
		const string = JSON.stringify(value);
		const bytes = new TextEncoder().encode(string);
		const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
		return btoa(binString);
	} catch (e) {
		return null;
	}
}

/**
 * @param {String} base64
 * @returns {Object|null}
 */
function fromBase64(base64) {
	try {
		const binString = atob(base64);
		const uint8Array = Uint8Array.from(binString, (m) => m.codePointAt(0));
		const decodedValue = new TextDecoder().decode(uint8Array);
		return JSON.parse(decodedValue);
	} catch (e) {
		return null;
	}
}

export const StringUtils = Object.freeze({
	kebabToPascal,
	titleToKebab,
	localize,
	capitalize,
	truncate,
	toBase64,
	fromBase64,
});
