/**
 * @param {FUItem} item
 * @returns {string}
 */
function resolveItemGroup(item) {
	let source;
	if (item) {
		/** @type ItemType **/
		switch (item.type) {
			case 'spell':
				source = 'spell';
				break;
			case 'basic':
			case 'weapon':
			case 'customWeapon':
				source = 'attack';
				break;
			case 'skill':
			case 'optionalFeature':
			case 'classFeature':
			case 'miscAbility':
			case 'rule':
				source = 'skill';
				break;
			case 'consumable':
				source = 'item';
				break;
		}
	}
	return source;
}

/**
 * @desc Utility functions to deal with the system's items.
 */
export const ItemUtils = Object.freeze({
	resolveItemGroup,
});
