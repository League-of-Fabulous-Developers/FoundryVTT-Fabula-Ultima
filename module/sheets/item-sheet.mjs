/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class FUItemSheet extends ItemSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['fabulaultima', 'sheet', 'item'],
			width: 700,
			height: 700,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'description',
				},
			],
		});
	}

	/** @override */
	get template() {
		const path = 'systems/fabulaultima/templates/item';
		// Return a single sheet for all item types.
		// return `${path}/item-sheet.html`;

		// Alternatively, you could use the following return statement to do a
		// unique item sheet by type, like `weapon-sheet.html`.
		return `${path}/item-${this.item.type}-sheet.html`;
	}

	/* -------------------------------------------- */

	/** @override */
	getData() {
		// Retrieve base data structure.
		const context = super.getData();

		// Use a safe clone of the actor data for further operations.
		const actor = this.object?.parent ?? null;
		const actorData = actor ? actor.toObject(false) : null;

		// Use a safe clone of the item data for further operations.
		const itemData = context.item;

		// Retrieve the roll data for TinyMCE editors.
		context.rollData = {};
		if (actor) {
			context.rollData = actor.getRollData();
		}

		// Add the actor's data to context.data for easier access, as well as flags.
		context.system = itemData.system;
		context.flags = itemData.flags;

		// Add the actor object to context for easier access
		context.actor = actorData;

		return context;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Roll handlers, click handlers, etc. would go here.

		// Cast Spell Button

		// [PDFPager Support] Opening Journal PDF pages from PDF Code
		$('#pdfLink').click(function () {
			const inputValue = $('input[name="system.source.value"]').val();
			const match = inputValue.match(/([A-Za-z]+)(\d+)/);

			if (match) {
				const pdfCode = match[1];
				const pageNumber = match[2];

				// Check if the openPDFByCode function exists
				if (ui.pdfpager && ui.pdfpager.openPDFByCode) {
					ui.pdfpager.openPDFByCode(pdfCode, { page: pageNumber });
				} else {
					// TODO: Create Fallback method using a normal Foundry link
				}
			} else {
				console.error('Invalid input format. Please use proper syntax "PDFCode PageNumber"');
			}
		});
	}
}
