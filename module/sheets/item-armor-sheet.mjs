import { FUStandardItemSheet } from './item-standard-sheet.mjs';
import { SYSTEM, systemPath } from '../helpers/config.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
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
			return this.item.system.slotTechnosphere(item);
		}
	}

	static #editTechnosphere(event, element) {
		const id = element.closest('[data-item-id]').dataset.itemId;
		this.item.system.items.get(id).sheet.render({ force: true });
	}

	static async #removeTechnosphere(event, element) {
		const uuid = element.closest('[data-uuid]').dataset.uuid;
		const technosphere = await fromUuid(uuid);

		if (technosphere) {
			return this.item.system.removeTechnosphere(technosphere);
		}
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
