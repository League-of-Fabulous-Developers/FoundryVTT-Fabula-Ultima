/**
 * @description Utility functions for working with {@link HTMLElement}
 * @type {Readonly<{findWithDataset: ((function(HTMLElement): ({dataset}|HTMLElement|null))|*)}>}
 */
export const HTMLUtils = Object.freeze({
	/**
	 * @param {HTMLElement} element
	 * @returns {{dataset}|HTMLElement|null}
	 */
	findWithDataset: (element) => {
		let current = element;
		while (current) {
			if (current.dataset && Object.keys(current.dataset).length > 0) {
				return current;
			}
			current = current.parentElement;
		}
		return null;
	},
	/**
	 * @param {PointerEvent|MouseEvent} event
	 * @returns {KeyboardModifiers}
	 */
	getKeyboardModifiers: (event) => {
		return {
			shift: event?.shiftKey ?? false,
			alt: event?.altKey ?? false,
			ctrl: event?.ctrlKey ?? false,
			meta: event?.metaKey ?? false,
		};
	},

	/**
	 * @param {HTMLElement} element
	 * @param {Record} context
	 */
	initializeIconRadioGroups: (element, context) => {
		// Get all radio inputs in the dialog
		const allRadios = element.querySelectorAll('.fu-icon__radio__label input[type="radio"]');
		// Group radios by their "name"
		const radiosByGroup = Array.from(allRadios).reduce((groups, radio) => {
			const name = radio.name;
			if (!groups[name]) groups[name] = [];
			groups[name].push(radio);
			return groups;
		}, {});

		// Iterate over each group
		Object.entries(radiosByGroup).forEach(([groupName, radios]) => {
			// Set initial selection from the map
			const selectedValue = context[groupName];
			radios.forEach((radio) => {
				const label = radio.parentElement;
				if (radio.value === selectedValue) {
					radio.checked = true;
					label.classList.add('selected');
				} else {
					radio.checked = false;
					label.classList.remove('selected');
				}

				// Attach change listener
				radio.addEventListener('change', () => {
					radios.forEach((r) => r.parentElement.classList.remove('selected'));
					if (radio.checked) radio.parentElement.classList.add('selected');
				});
			});
		});
	},

	/**
	 * @param {RegExpMatchArray} match
	 * @param {DOMStringMap} dataset
	 */
	appendRegexGroupsToDataset(match, dataset) {
		if (!match?.groups) return;

		for (const [key, value] of Object.entries(match.groups)) {
			dataset[key] = value ?? '';
		}
	},

	/**
	 * @param fn A function
	 * @param ms The time in milliseconds.
	 * @returns {(function(...[*]): void)|*}
	 */
	debounce: (fn, ms) => {
		let timer;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), ms);
		};
	},

	/**
	 * @desc Sets up basic input safeguards.
	 * @param html
	 */
	setupInputs: (html) => {
		html.querySelectorAll('input').forEach((input) => {
			input.addEventListener('keydown', (event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					event.currentTarget.blur();
				}
			});
		});
	},

	/**
	 * @param {String} name
	 * @returns {string}
	 */
	getCSSVariable(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	},

	/**
	 * @param {Number} width
	 * @param {Number} height
	 * @returns {{ratio: string, w: number, h: number}}
	 */
	getAspectRatio(width, height) {
		const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
		const divisor = gcd(width, height);
		return {
			ratio: `${width / divisor} / ${height / divisor}`,
			w: width / divisor,
			h: height / divisor,
		};
	},

	/**
	 * @desc Resolves the natural dimensions of an image from a path.
	 * @param {string} src
	 * @returns {Promise<[number, number]>} [width, height]
	 */
	resolveImageDimensions(src) {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
			img.onerror = () => resolve([0, 0]); // fallback to default layout
			img.src = src;
		});
	},

	/**
	 * @typedef {'medium'|'large'|'portrait'|'wide'} ViewerLayout
	 */

	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {number} textLength
	 * @returns {ViewerLayout|null}
	 */
	getViewerLayout(width, height, textLength) {
		const ratio = width / height;

		if (ratio < 0.9 || textLength <= 50) return 'portrait';
		if (width >= 600) return 'large';
		if (textLength > 500) return 'wide';
		if (width >= 300 && textLength >= 500) return 'medium';
		return null;
	},
});
