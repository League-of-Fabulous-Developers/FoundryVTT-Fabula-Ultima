import FoundryUtils from '../../helpers/foundry-utils.mjs';

/**
 * @typedef ItemSelectionData
 * @property {String} title
 * @property {String} message
 * @property {FUItem[]|FUActiveEffect[]} items
 * @property {FUItem|FUActiveEffect} initial
 * @property {Number} max
 */

/**
 * @prop {ItemSelectionData} data
 */
export class ItemSelectionDialog {
	/**
	 * @type {ItemSelectionData}
	 */
	#data;

	/**
	 * @param {ItemSelectionData} data
	 */
	constructor(data) {
		this.#data = data;
	}

	/**
	 * @returns {ItemSelectionData}
	 */
	get data() {
		return this.#data;
	}

	/**
	 * @returns {Object[]} selected
	 */
	async open() {
		const context = {
			...this.data,
		};

		/**
		 * @param {HTMLElement} container
		 * @param {HTMLElement} card
		 */
		const toggleCardSelection = (container, card) => {
			if (!card.classList.contains('selected')) {
				const selectedCards = container.querySelectorAll('.fu-item-card.selected');
				if (selectedCards.length >= this.data.max) return;
				card.classList.add('selected');
			} else {
				card.classList.remove('selected');
			}
		};

		const result = await foundry.applications.api.DialogV2.input({
			window: {
				title: this.data.title,
			},
			position: {
				width: 440,
			},
			actions: {
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				selectType: (event, dialog) => {},
			},
			classes: ['projectfu', 'backgroundstyle', 'fu-dialog'],
			content: await FoundryUtils.renderTemplate('dialog/dialog-item-selection', context),
			rejectClose: false,
			ok: {
				icon: "<i class='fas fa-check'></i>",
				label: 'FU.Confirm',
			},
			/** @param {Event} event
			 *  @param {HTMLElement} dialog **/
			render: (event, dialog) => {
				const document = dialog.element;
				const container = document.querySelector('.fu-item-grid');

				// ✅ Initial sync on first render
				for (const input of container.querySelectorAll('input[name="selected"]:checked')) {
					const card = input.closest('.fu-item-card');
					if (card) {
						toggleCardSelection(container, card);
					}
				}

				// ✅ Event handling
				container.addEventListener('mousedown', (event) => {
					const card = event.target.closest('.fu-item-card');
					if (!card) return;
					toggleCardSelection(container, card);
				});
			},
		});
		if (result) {
			console.debug(result);
			const selectedValues = new Set(Array.isArray(result.selected) ? result.selected : result.selected ? [result.selected] : []);

			return this.data.items.filter((item) => selectedValues.has(item.name));
		} else {
			throw Error('Canceled by user.');
		}
	}
}
