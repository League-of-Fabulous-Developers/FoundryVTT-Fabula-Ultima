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
 * @param obj The object to resolve the property from
 * @param path The path to the property, in dot notation
 * @returns {undefined|*} The value of the property
 */
function getPropertyValueByPath(obj, path) {
	const keys = path.split('.');
	let value = obj;

	for (let key of keys) {
		if (typeof value === 'object' && value !== null) {
			value = value[key];
		} else {
			return undefined;
		}
	}

	return value;
}

export const ObjectUtils = Object.freeze({
	mergeRecursive,
	getPropertyValueByPath,
});
