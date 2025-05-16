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

export const ObjectUtils = Object.freeze({
	mergeRecursive,
});
