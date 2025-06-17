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
	 * @param {PointerEvent} event
	 * @returns {KeyboardModifiers}
	 */
	getKeyboardModifiers: (event) => {
		return {
			shift: event.shiftKey,
			alt: event.altKey,
			ctrl: event.ctrlKey,
			meta: event.metaKey,
		};
	},
});

/**
 * @typedef KeyboardModifiers
 * @property {boolean} shift
 * @property {boolean} alt
 * @property {boolean} ctrl
 * @property {boolean} meta
 */
