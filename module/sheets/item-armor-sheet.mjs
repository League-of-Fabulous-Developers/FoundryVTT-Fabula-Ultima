import { FUStandardItemSheet } from './item-standard-sheet.mjs';
import { SYSTEM, systemPath } from '../helpers/config.mjs';
import { MnemosphereDataModel } from '../documents/items/mnemosphere/mnemosphere-data-model.mjs';
import { PseudoItem } from '../documents/items/pseudo-item.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { HoplosphereDataModel } from '../documents/items/hoplosphere/hoplosphere-data-model.mjs';
import { SETTINGS } from '../settings.js';
import { getTechnosphereSlotInfo } from '../helpers/technospheres.mjs';

export class FUItemArmorSheet extends FUStandardItemSheet {
	static DEFAULT_OPTIONS = {
		actions: {
			edit: FUItemArmorSheet.#editTechnosphere,
			delete: FUItemArmorSheet.#removeTechnosphere,
		},
		dragDrop: [
			{
				dropSelector: '.technosphere-slots__slot--empty',
				callbacks: {
					drop: FUItemArmorSheet.#slotTechnosphere,
				},
			},
		],
	};

	/**
	 * @description The default template parts
	 * @override
	 * @type Record<HandlebarsTemplatePart>
	 */
	static PARTS = {
		...super.PARTS,
		description: { template: systemPath(`templates/item/partials/item-armor-description.hbs`) },
	};

	static async #slotTechnosphere(event) {
		const data = TextEditor.getDragEventData(event);
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
			const { slotted, slotCount, mnemosphereSlots } = this.item.system;
			context.slots = getTechnosphereSlotInfo(slotted, slotCount, mnemosphereSlots);
		}
		return context;
	}
}
