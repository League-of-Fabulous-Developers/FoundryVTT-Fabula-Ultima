import { FUStandardItemSheet } from './item-standard-sheet.mjs';
import { SYSTEM, systemPath } from '../helpers/config.mjs';
import { MnemosphereDataModel } from '../documents/items/mnemosphere/mnemosphere-data-model.mjs';
import { PseudoItem } from '../documents/pseudo/pseudo-item.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { HoplosphereDataModel } from '../documents/items/hoplosphere/hoplosphere-data-model.mjs';
import { SETTINGS } from '../settings.js';

export class FUItemArmorSheet extends FUStandardItemSheet {
	static DEFAULT_OPTIONS = {
		actions: {
			edit: FUItemArmorSheet.#editTechnosphere,
			delete: FUItemArmorSheet.#removeTechnosphere,
		},
	};

	#DRAG_DROP_CONFIG = [
		{
			dropSelector: '.technosphere-slots .slot',
			callbacks: {
				drop: FUItemArmorSheet.#slotTechnosphere,
			},
		},
	];

	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		...super.PARTS,
		description: { template: systemPath(`templates/item/partials/item-armor-description.hbs`) },
	};

	#dragDrop = null;

	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
	}

	#createDragDropHandlers() {
		return this.#DRAG_DROP_CONFIG.map((d) => {
			d.permissions ??= {};
			d.callbacks = Object.fromEntries(Object.entries(d.callbacks ?? {}).map(([k, v]) => [k, v.bind(this)]));
			return new foundry.applications.ux.DragDrop(d);
		});
	}

	_onRender(context, options) {
		super._onRender(context, options);
		this.#dragDrop.forEach((d) => d.bind(this.element));
	}

	static async #slotTechnosphere(event) {
		const data = TextEditor.getDragEventData(event);
		console.log(data);
		if (data.type === 'Item') {
			const item = await fromUuid(data.uuid);

			if (item.system instanceof MnemosphereDataModel || item.system instanceof HoplosphereDataModel) {
				if (item.system.socketable === 'weapon') {
					ui.notifications.error('FU.TechnospheresSlottingErrorWeaponOnly', { localize: true });
					return;
				}

				const promises = [];
				promises.push(this.item.system.createEmbeddedDocuments(PseudoItem.documentName, [item.toObject(true)]));
				if (item.isEmbedded) {
					promises.push(item.delete());
				}
				return Promise.all(promises);
			} else {
				ui.notifications.error('FU.TechnospheresSlottingErrorNotTechnospheres');
			}
		}
	}

	static #editTechnosphere(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).sheet.render({ force: true });
	}

	static #removeTechnosphere(event, element) {
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

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		if (game.settings.get(SYSTEM, SETTINGS.technospheres)) {
			context.technosphereMode = true;
			context.slots = this.#createSlotArray();
		}
		return context;
	}

	#createSlotArray() {
		const items = this.item.system.slotted;

		const slots = [];

		const usedSlots = items.reduce((previousValue, currentValue) => previousValue + (currentValue.system instanceof HoplosphereDataModel ? currentValue.system.requiredSlots : 1), 0);
		const itemSlots = this.item.system.slotCount;
		let unusedSlots = itemSlots;
		const totalMnemosphereSlots = this.item.system.mnemosphereSlots;
		let unusedMnemosphereSlots = totalMnemosphereSlots;
		const totalSlots = Math.max(usedSlots, itemSlots);

		for (let itemIdx = 0, slotIdx = 0; slotIdx < totalSlots; itemIdx++, slotIdx++, unusedSlots--) {
			const currentItem = items[itemIdx];
			const currentSlot = {
				item: currentItem,
				type: 'hoplosphere',
			};
			slots[slotIdx] = currentSlot;

			if (currentItem?.system instanceof MnemosphereDataModel) {
				currentSlot.overCapacity = slotIdx >= totalMnemosphereSlots;
				currentSlot.type = 'mnemosphere';
				unusedMnemosphereSlots--;
			} else if (currentItem?.system instanceof HoplosphereDataModel) {
				currentSlot.overCapacity = slotIdx >= itemSlots;

				if (currentItem.system.requiredSlots === 2) {
					slotIdx++;
					const occupiedSlot = (slots[slotIdx] = {
						type: 'hoplosphere',
						occupied: true,
						overCapacity: slotIdx >= itemSlots,
					});
					currentSlot.overCapacity = occupiedSlot.overCapacity;
				}
			}

			if (unusedMnemosphereSlots && (!currentSlot.item || unusedSlots === unusedMnemosphereSlots)) {
				currentSlot.type = 'mnemosphere';
				unusedMnemosphereSlots--;
			}
		}

		return slots;
	}
}
