import FoundryUtils from '../../helpers/foundry-utils.mjs';
import { StringUtils } from '../../helpers/string-utils.mjs';

/**
 * @typedef DialogSelectableItem
 * @property {String} name
 * @property {String} img
 */

/**
 * @typedef ItemSelectionColumn
 * @property {String} label
 * @property {function(Item) : String} getContent
 */

/**
 * @typedef {'grid'|'list'|'deck'} FUSelectionDialogStyle
 */

/**
 * @typedef ItemSelectionData
 * @property {String} title
 * @property {String} message
 * @property {DialogSelectableItem[]} items
 * @property {Object[]} payload Associated data returned instead of the item reference.
 * @property {FUItem[]} compendiumItems If assigned, will be used to compare to the original items.
 * @property {Object[]} initial
 * @property {ItemSelectionColumn[]} columns Additional columns for the dialog.
 * @property {FUSelectionDialogStyle} style
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
	 * @type {Number[]}
	 */
	#selectedIndexes;

	/**
	 * @param {ItemSelectionData} data
	 */
	constructor(data) {
		data.style = data.style ?? 'grid';
		data.title = data.title ?? StringUtils.localize('FU.Selection');
		this.#data = data;
		this.#selectedItems = [];
		this.#selectedIndexes = [];
		if (data.initial) {
			this.#selectedItems.push(...data.initial);
			this.#selectedIndexes.push(...data.initial.map((initial) => (initial._originalIndex !== undefined ? initial._originalIndex : data.items.findIndex((item) => item.id === initial.id))));
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
		// Additional columns
		let columnData = {};
		if (this.data.columns) {
			for (const column of this.data.columns) {
				columnData[column.label] = await Promise.all(this.data.items.map((item) => column.getContent(item)));
			}
		}
		const context = {
			...this.data,
			descriptions,
			columnData,
		};

		/**
		 * @param {HTMLElement} container
		 * @param {HTMLElement} card
		 * @param {Boolean} updateData
		 */
		const toggleCardSelection = (container, card, updateData = true) => {
			const index = Number.parseInt(card.dataset.index);
			const cardItem = this.data.items[index];
			if (!card.classList.contains('selected')) {
				const selectedCards = container.querySelectorAll('.fu-item.selected');
				if (selectedCards.length >= this.data.max) return;
				card.classList.add('selected');
				if (updateData) {
					this.#selectedItems.push(cardItem);
					this.#selectedIndexes.push(index);
				}
			} else {
				card.classList.remove('selected');
				if (updateData) {
					this.#selectedItems = this.#selectedItems.filter((it) => it !== cardItem);
					this.#selectedIndexes = this.#selectedIndexes.filter((it) => it !== index);
				}
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
				selectAll: (event, dialog) => {
					const inputs = dialog.closest('#items').querySelectorAll('input[name="selected"]');
					const selectedIndexes = [];
					for (const input of inputs) {
						input.checked = true;
						const card = input.closest('.fu-item');
						if (card) {
							card.classList.toggle('selected', true);
							const index = Number.parseInt(card.dataset.index);
							if (Number.isFinite(index)) selectedIndexes.push(index);
						}
					}
					this.#selectedItems = this.data.items;
					this.#selectedIndexes = selectedIndexes;
					return false;
				},
				/** @param {Event} event
				 *  @param {HTMLElement} dialog **/
				deselectAll: (event, dialog) => {
					const inputs = dialog.closest('#items').querySelectorAll('input[name="selected"]:checked');
					for (const input of inputs) {
						input.checked = false;
						const card = input.closest('.fu-item');
						if (card) {
							card.classList.toggle('selected', false);
						}
					}
					this.#selectedItems = [];
					this.#selectedIndexes = [];
					return false;
				},
			},
			classes: ['projectfu', 'backgroundstyle', 'fu-dialog'],
			content: await FoundryUtils.renderTemplate('dialog/dialog-item-selection', context),
			rejectClose: false,
			ok: {
				icon: 'fas fa-check',
				label: this.data.okLabel ?? 'FU.Confirm',
			},
			/** @param {Event} event
			 *  @param {HTMLElement} dialog **/
			render: async (event, dialog) => {
				const document = dialog.element;
				const container = document.querySelector('#items');
				const searchInput = document.querySelector('[data-role="selection-filter"]');

				const applySearchFilter = () => {
					if (!container || !searchInput) return;
					const query = searchInput.value.trim().toLocaleLowerCase();

					for (const entry of container.querySelectorAll('.fu-item[data-index]')) {
						const target = entry.closest('tr') ?? entry;
						const name = (entry.dataset.name || entry.textContent || '').toLocaleLowerCase();
						target.style.display = !query || name.includes(query) ? '' : 'none';
					}

					if (this.data.style !== 'grouped-list') return;
					for (const header of container.querySelectorAll('.group-header')) {
						let row = header.nextElementSibling;
						let hasVisibleRows = false;
						while (row && !row.classList.contains('group-header')) {
							if (row.style.display !== 'none') {
								hasVisibleRows = true;
								break;
							}
							row = row.nextElementSibling;
						}
						header.style.display = hasVisibleRows ? '' : 'none';
					}
				};

				searchInput?.addEventListener('input', applySearchFilter);

				// Handle opening journal entries when clicking the icon
				document.addEventListener(
					'click',
					(clickEvent) => {
						const wrapper = clickEvent.target.closest('.journal-page-icon-wrapper');
						if (wrapper) {
							clickEvent.preventDefault();
							clickEvent.stopPropagation();
							const journalUuid = wrapper.dataset.journalUuid;
							const pageUuid = wrapper.dataset.pageUuid;
							if (journalUuid && pageUuid) {
								const journal = fromUuidSync(journalUuid);
								const page = fromUuidSync(pageUuid);

								if (journal && page) {
									const jSheet = journal.sheet;
									const goToPage = () => {
										if (typeof jSheet.goToPage === 'function') return jSheet.goToPage(page.id);
										if (typeof jSheet.navigatePage === 'function') return jSheet.navigatePage(page.id);
									};

									if (jSheet.rendered) {
										goToPage();
										return;
									}

									Hooks.once('renderJournalSheet', (sheet) => {
										if (sheet === jSheet) goToPage();
									});
									jSheet.render(true, { pageId: page.id });
								}
							}
						}
					},
					true,
				);

				// Initial Selection
				const inputs = container.querySelectorAll('input[name="selected"]:checked');
				for (const input of inputs) {
					const card = input.closest('.fu-item');
					if (card) {
						toggleCardSelection(container, card, false);
					}
				}

				if (this.data.style !== 'list' && this.data.style !== 'grouped-list') {
					container.addEventListener('mousedown', async (event) => {
						const card = event.target.closest('.fu-item');
						if (!card) return;
						toggleCardSelection(container, card);
					});
				} else {
					container.addEventListener('change', (event) => {
						const input = event.target;

						// Handle group checkbox
						if (input?.name === 'group-selected') {
							const groupIndex = Number.parseInt(input.dataset.groupIndex);
							if (Number.isFinite(groupIndex) && this.data.groups && this.data.groups[groupIndex]) {
								const groupRow = input.closest('.group-header');
								if (groupRow) {
									const nextRow = groupRow.nextElementSibling;
									let currentRow = nextRow;
									// Toggle all pages in this group
									while (currentRow && !currentRow.classList.contains('group-header')) {
										const pageCheckbox = currentRow.querySelector('input[name="selected"]');
										if (pageCheckbox) {
											pageCheckbox.checked = input.checked;
											pageCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
										}
										currentRow = currentRow.nextElementSibling;
									}
								}
							}
							return;
						}

						// Handle individual page checkbox
						if (input?.name !== 'selected') return;
						const card = input.closest('.fu-item');
						if (!card) return;
						const index = Number.parseInt(card.dataset.index);
						if (!Number.isFinite(index)) return;
						const listItem = this.data.items[index];
						if (input.checked) {
							if (!this.#selectedIndexes.includes(index)) {
								this.#selectedItems.push(listItem);
								this.#selectedIndexes.push(index);
							}
						} else {
							this.#selectedItems = this.#selectedItems.filter((it) => it !== listItem);
							this.#selectedIndexes = this.#selectedIndexes.filter((it) => it !== index);
						}
					});
				}

				applySearchFilter();
			},
		});
		if (result) {
			// If a custom payload is expected
			if (this.data.payload) {
				return this.#selectedIndexes.map((idx) => this.data.payload[idx]);
			} else {
				return this.#selectedItems;
			}
		} else {
			throw Error('Canceled by user.');
		}
	}
}
