import { PseudoItem } from '../pseudo-item.mjs';
import { MnemosphereDataModel } from '../mnemosphere/mnemosphere-data-model.mjs';
import { FUItemSheet } from '../../../sheets/item-sheet.mjs';
import { getTechnosphereSlotInfo } from '../../../helpers/technospheres.mjs';
import { TextEditor } from '../../../helpers/text-editor.mjs';

export class MnemosphereReceptacleSheet extends FUItemSheet {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			edit: MnemosphereReceptacleSheet.#editNested,
			delete: MnemosphereReceptacleSheet.#deleteNested,
			debug: MnemosphereReceptacleSheet.#printDebug,
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
		position: {
			width: 700,
		},
	};

	static PARTS = {
		header: super.PARTS.header,
		main: {
			template: 'systems/projectfu/templates/item/mnemosphere-receptacle/mnemosphere-receptacle-main.hbs',
		},
	};

	static #printDebug() {
		console.log(this);
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

	static #onItemRoll(event, element) {
		const itemId = element.closest('[data-item-id]').dataset.itemId;
		const item = this.item.system.items.get(itemId);
		if (item) {
			item.roll();
		}
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dragSelector: null,
			dropSelector: '.technosphere-slots__slot--empty',
			permissions: {},
			callbacks: { drop: this.#addNested.bind(this) },
		}).bind(this.element);
	}

	async #addNested(event) {
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

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const items = this.item.system.slotted;
		const slots = getTechnosphereSlotInfo(items, this.item.system.slotCount, this.item.system.slotCount);

		context.item = this.item;
		context.system = this.item.system;
		context.slots = slots;
		context.slotOptions = Object.fromEntries(new Array(5).values().map((_, idx) => [idx + 1, idx + 1]));

		return context;
	}

	_canDragDrop(selector) {
		// only allow specialised technosphere drop procedure
		return false;
	}
}
