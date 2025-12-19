/**
 * @param {Object} target
 * @param {Object} source
 * @returns {(Object|boolean)[]}
 */
function mergeRecursive(target, source) {
	let changed = false;

	for (const [key, value] of Object.entries(source)) {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			if (!(key in target)) {
				target[key] = {};
				changed = true;
			}

			const [nestedTarget, nestedChanged] = mergeRecursive(target[key], value);
			target[key] = nestedTarget;
			if (nestedChanged) changed = true;
		} else if (!(key in target) || target[key] !== value) {
			target[key] = value;
			changed = true;
		}
	}

	return [target, changed];
}

/**
 * @param {Object} obj The object to resolve the property from
 * @param {String} path The path to the property, in dot notation
 * @returns {undefined|*} The value of the property
 */
function getProperty(obj, path) {
	return foundry.utils.getProperty(obj, path);
}

/**
 *
 * @param {Object} obj
 * @returns {Object} An object without any undefined properties
 */
function cleanObject(obj) {
	return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

/**
 * @description Given a record, will return an object with a subset of its key-value pairs.
 * @param {Record} record
 * @param {String[]} keys
 * @returns {{[p: string]: any}}
 */
function pick(record, keys) {
	return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
}

export const ObjectUtils = Object.freeze({
	mergeRecursive,
	getProperty,
	cleanObject,
	pick,
});
