import FoundryUtils from '../../helpers/foundry-utils.mjs';

/**
 * @typedef ItemSelectionData
 * @property {String} title
 * @property {String} message
 * @property {Object[]} items
 * @property {Number} max
 * @property {function(Object): string} getName   Function to get the name of an item
 * @property {function(Object): string} getImage  Function to get the image URL of an item
 */

export class SelectionGridDialog {
	/**
	 * @param {ItemSelectionData} data
	 * @returns {Object[]} selected
	 */
	static async open(data) {
		const context = {
			...data,
			names: data.items.map((item) => data.getName(item)),
			images: data.items.map((item) => data.getImage(item)),
			/** @type Object[] **/
			selected: [],
		};

		const result = await foundry.applications.api.DialogV2.input({
			window: {
				title: data.title,
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
			content: await FoundryUtils.renderTemplate('dialog/dialog-selection-grid', context),
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
				container.addEventListener('mousedown', (event) => {
					const card = event.target.closest('.fu-item-card');
					if (!card) return;

					if (!card.classList.contains('selected')) {
						const selectedCards = container.querySelectorAll('.fu-item-card.selected');
						if (selectedCards.length >= data.max) return;
						card.classList.add('selected');
					} else {
						card.classList.remove('selected');
					}
				});
			},
		});
		if (result) {
			console.debug(result);
			const selectedValues = Array.isArray(result.selected) ? result.selected : [result.selected];
			return data.items.filter((item) => selectedValues.includes(item.name));
		} else {
			throw Error('Canceled by user');
		}
	}
}
