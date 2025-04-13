/**
 * @description Randomizes the order of elements in an array in-place using the Durstenfeld shuffle algorithm. *
 * @param {Array} array - The array to be shuffled.
 * @returns {void} The array is modified in-place.
 */
function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

export const CollectionUtils = Object.freeze({
	shuffleArray,
});
