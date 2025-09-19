import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { EquipmentTableRenderer } from '../helpers/tables/equipment-table-renderer.mjs';
import { Checks } from '../checks/checks.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { TreasuresTableRenderer } from '../helpers/tables/treasures-table-renderer.mjs';
import { ConsumablesTableRenderer } from '../helpers/tables/consumables-table-renderer.mjs';
import { OtherItemsTableRenderer } from '../helpers/tables/other-items-table-renderer.mjs';
import { getPrioritizedUserTargeted } from '../helpers/target-handler.mjs';

/**
 * @property {FUActor} actor
 * @extends {ActorSheet}
 */
export class FUStashSheet extends FUActorSheet {
	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['stash'],
		resizable: true,
		position: { width: 600, height: 768 },
		dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
		actions: {
			createItem: this.#onCreate,
			editItem: this.#onEdit,
			roll: this.#onRoll,
			clearInventory: this.#onClearInventory,
			createEquipment: this.#onCreateEquipment,
			lootItem: this.#onLootItem,
			sellItem: this.#onSellItem,
			distributeZenit: this.#onDistributeZenit,
			rechargeInventoryPoints: this.#onRechargeInventoryPoints,
		},
	};

	/**
	 * @override
	 */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/actor/actor-stash-sheet.hbs',
			root: true,
		},
	};

	#equipmentTable = new EquipmentTableRenderer();
	#treasuresTable = new TreasuresTableRenderer();
	#consumablesTable = new ConsumablesTableRenderer();
	#otherItemsTable = new OtherItemsTableRenderer('accessory', 'armor', 'consumable', 'shield', 'treasure', 'weapon');

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;
		ActorSheetUtils.activateDefaultListeners(html, this);
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		await ActorSheetUtils.prepareData(context, this);
		context.equipmentTable = await this.#equipmentTable.renderTable(this.document);
		context.treasuresTable = await this.#treasuresTable.renderTable(this.document);
		context.consumablesTable = await this.#consumablesTable.renderTable(this.document);
		context.otherItemsTable = await this.#otherItemsTable.renderTable(this.document);
		return context;
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.#equipmentTable.activateListeners(this);
		this.#treasuresTable.activateListeners(this);
		this.#consumablesTable.activateListeners(this);
		this.#otherItemsTable.activateListeners(this);
	}

	async _onDropItem(event, item) {
		const itemStashed = await ActorSheetUtils.handleStashDrop(this.actor, item);
		if (itemStashed === true) {
			return null;
		}

		return super._onDropItem(event, item);
	}

	static #onCreate(event, target) {
		const type = target.dataset.type;

		if (!type) {
			return;
		}
		const itemData = {
			type: type,
		};

		itemData.name = foundry.documents.Item.defaultName({ type: type, parent: this.actor });

		foundry.documents.Item.create(itemData, { parent: this.actor });
	}

	static #onEdit(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(itemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}

		if (item) {
			item.sheet.render(true);
		}
	}

	static #onRoll(event, target) {
		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(itemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}

		if (item) {
			return Checks.display(this.actor, item);
		}
	}

	static async #onClearInventory() {
		const clear = await foundry.applications.api.Dialog.confirm({
			content: game.i18n.format('FU.DialogDeleteItemDescription', { item: `${game.i18n.localize('FU.All')} ${game.i18n.localize('FU.Items')}` }),
			rejectClose: false,
		});
		if (clear) {
			console.debug(`Clearing all items from actor ${this.actor}`);
			return this.actor.clearEmbeddedItems();
		}
	}

	static async #onCreateEquipment() {
		const itemType = await foundry.applications.api.DialogV2.wait({
			window: { title: `${game.i18n.localize('FU.Create')} ${game.i18n.localize('FU.Item')}` },
			content: '',
			rejectClose: false,
			buttons: ['accessory', 'armor', 'shield', 'weapon'].map((choice) => ({
				action: choice,
				label: game.i18n.localize(CONFIG.Item.typeLabels[choice]),
			})),
		});

		if (itemType) {
			foundry.documents.Item.create({ type: itemType, name: foundry.documents.Item.defaultName({ type: itemType, parent: this.actor }) }, { parent: this.actor });
		}
	}

	static #onLootItem(event, target) {
		const dataItemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(dataItemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}
		if (item) {
			const targetActor = getPrioritizedUserTargeted();
			if (!targetActor) return;

			return InventoryPipeline.requestTrade(this.actor.uuid, item.uuid, false, targetActor.uuid, {
				shift: event?.shiftKey ?? false,
				ctrl: event?.ctrlKey ?? false,
				alt: event?.altKey ?? false,
				meta: event?.metaKey ?? false,
			});
		}
	}

	static #onSellItem(event, target) {
		const dataItemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item = this.actor.items.get(dataItemId);
		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
		}
		if (item) {
			return InventoryPipeline.tradeItem(this.actor, item, true);
		}
	}

	static #onDistributeZenit() {
		return InventoryPipeline.distributeZenit(this.actor);
	}

	static #onRechargeInventoryPoints() {
		return InventoryPipeline.requestRecharge(this.actor);
	}
}
