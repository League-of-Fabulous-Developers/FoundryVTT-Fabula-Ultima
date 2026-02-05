import FoundryUtils from '../../helpers/foundry-utils.mjs';

/**
 * @typedef ItemSelectionData
 * @property {String} title
 * @property {String} message
 * @property {FUItem[]|FUActiveEffect[]} items
 * @property {Object[]} initial
 * @property {'grid'|'list'} style
 * @property {Number} max
 * @property {(item: FUItem) => Promise<string>} getDescription
 * @property {String} okLabel
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
	 * @type {FUItem[]|FUActiveEffect[]}
	 */
	#selectedItems;

	/**
	 * @param {ItemSelectionData} data
	 */
	constructor(data) {
		data.style = data.style ?? 'grid';
		this.#data = data;
		this.#selectedItems = [];
		if (data.initial) {
			this.#selectedItems.push(...data.initial);
		}
	}

	/**
	 * @returns {ItemSelectionData}
	 */
	get data() {
		return this.#data;
	}

	/**
	 * @returns {Promise<Object[]>} selected
	 */
	async open() {
		// We cache the item descriptions here...
		const descriptions = await Promise.all(this.data.items.map((item) => this.data.getDescription(item)));
		const context = {
			...this.data,
			descriptions: descriptions,
		};

		/**
		 * @param {HTMLElement} container
		 * @param {HTMLElement} card
		 */
		const toggleCardSelection = (container, card) => {
			const cardItem = this.data.items[card.dataset.index];
			if (!card.classList.contains('selected')) {
				const selectedCards = container.querySelectorAll('.fu-item.selected');
				if (selectedCards.length >= this.data.max) return;
				card.classList.add('selected');
				this.#selectedItems.push(cardItem);
			} else {
				card.classList.remove('selected');
				this.#selectedItems = this.#selectedItems.filter((it) => it !== cardItem);
			}
		};

		const result = await foundry.applications.api.DialogV2.input({
			window: {
				title: this.data.title,
			},
			position: {
				width: 600,
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
				label: this.data.okLabel ?? 'FU.Confirm',
			},
			/** @param {Event} event
			 *  @param {HTMLElement} dialog **/
			render: async (event, dialog) => {
				const document = dialog.element;
				const container = document.querySelector('#items');

				// Initial Selection
				const inputs = container.querySelectorAll('input[name="selected"]:checked');
				for (const input of inputs) {
					const card = input.closest('.fu-item');
					if (card) {
						toggleCardSelection(container, card);
					}
				}
				// ✅ Event handling
				container.addEventListener('mousedown', async (event) => {
					const card = event.target.closest('.fu-item');
					if (!card) return;
					toggleCardSelection(container, card);
				});
			},
		});
		if (result) {
			console.debug(result);
			return this.#selectedItems;
		} else {
			throw Error('Canceled by user.');
		}
	}
}
