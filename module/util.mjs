/**
 * Takes an input and returns the slugged string of it.
 * @param {any} input - The input to be slugged.
 * @returns {string} - The slugged version of the input string.
 */
export function slugify(input) {
	const slugged = String(input)
		.normalize('NFKD') // split accented characters into their base characters and diacritical marks
		.replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
		.toLowerCase() // convert to lowercase
		.replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
		.replace(/\s+/g, '-') // replace spaces with hyphens
		.replace(/-+/g, '-') // remove consecutive hyphens
		.replace(/^-+/g, '') // remove leading hyphens
		.replace(/-+$/g, '') // remove trailing hyphens
		.trim(); // trim leading or trailing whitespace

	console.debug([input, slugged]);
	return slugged;
}
