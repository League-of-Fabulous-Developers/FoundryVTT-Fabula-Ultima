function kebabToPascal(str) {
	return str
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

function titleToKebab(str) {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/\s+/g, '-')
		.toLowerCase();
}

export const StringUtils = Object.freeze({
	kebabToPascal,
	titleToKebab,
});
