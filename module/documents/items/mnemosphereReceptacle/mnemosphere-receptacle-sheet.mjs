import { editImageFile } from '../../../helpers/image-file-picker.mjs';
import { PseudoItem } from '../../pseudo/pseudo-item.mjs';
import { MnemosphereDataModel } from '../mnemosphere/mnemosphere-data-model.mjs';

export class MnemosphereReceptacleSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			edit: MnemosphereReceptacleSheet.#editNested,
			delete: MnemosphereReceptacleSheet.#deleteNested,
			debug: MnemosphereReceptacleSheet.#printDebug,
			editImage: MnemosphereReceptacleSheet.#onEditImage,
			roll: MnemosphereReceptacleSheet.#onItemRoll,
		},
		window: {
			controls: [
				{
					icon: 'far fa-bug',
					label: 'Print debug info',
					action: 'debug',
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		classes: ['mnemosphere-receptacle-sheet'],
		dragDrop: [{ dragSelector: null, dropSelector: '.slot.empty-slot', permissions: {}, callbacks: { drop: MnemosphereReceptacleSheet.#addNested } }],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: {
			template: 'systems/projectfu/templates/item/mnemosphere-receptacle/mnemosphere-receptacle-header.hbs',
		},
		main: {
			template: 'systems/projectfu/templates/item/mnemosphere-receptacle/mnemosphere-receptacle-main.hbs',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	static async #addNested(event) {
		const data = TextEditor.getDragEventData(event);
		console.log(data);
		if (data.type === 'Item') {
			const item = await fromUuid(data.uuid);

			if (item.system instanceof MnemosphereDataModel) {
				const promises = [];
				promises.push(this.item.system.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]));
				if (item.isEmbedded) {
					promises.push(item.delete());
				}
				return Promise.all(promises);
			} else {
				ui.notifications.error('Only Mnemospheres can be slotted in this item.');
			}
		}
	}

	/**
	 * @param {Event} event
	 * @param {HTMLElement} element
	 */
	static #editNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).sheet.render({ force: true });
	}

	static #deleteNested(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		const promises = [];
		const item = this.item.system.items.get(id);
		if (item.actor && item.system instanceof MnemosphereDataModel) {
			const itemObject = item.toObject(true);
			promises.push(this.item.actor.createEmbeddedDocuments('Item', [itemObject]));
		}
		promises.push(item.delete());
		return Promise.all(promises);
	}

	static async #onEditImage(_event, element) {
		await editImageFile(this, element);
	}

	static #onItemRoll(event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		const item = this.item.system.items.get(itemId);
		if (item) {
			item.roll();
		}
	}

	#dragDrop;

	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
	}

	/**
	 * Create drag-and-drop workflow handlers for this Application
	 * @returns {DragDrop[]}     An array of DragDrop handlers
	 * @private
	 */
	#createDragDropHandlers() {
		return this.options.dragDrop.map((d) => {
			d.permissions = {};
			d.callbacks = Object.fromEntries(Object.entries(d.callbacks).map(([k, v]) => [k, v.bind(this)]));
			return new foundry.applications.ux.DragDrop(d);
		});
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		this.#dragDrop.forEach((d) => d.bind(this.element));
	}

	async _prepareContext() {
		const items = this.item.system.items.contents;
		const slots = new Array(Math.max(items.length, this.item.system.slotCount))
			.values()
			.map((_, i) => ({
				item: items[i],
				overCapacity: i >= this.item.system.slotCount,
			}))
			.toArray();

		return {
			item: this.item,
			system: this.item.system,
			slots: slots,
			slotOptions: Object.fromEntries(new Array(5).values().map((_, idx) => [idx + 1, idx + 1])),
		};
	}
}
