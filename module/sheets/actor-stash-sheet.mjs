import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { EquipmentTableRenderer } from '../helpers/tables/equipment-table-renderer.mjs';
import { Checks } from '../checks/checks.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';
import { TreasuresTableRenderer } from '../helpers/tables/treasures-table-renderer.mjs';
import { ConsumablesTableRenderer } from '../helpers/tables/consumables-table-renderer.mjs';
import { OtherItemsTableRenderer } from '../helpers/tables/other-items-table-renderer.mjs';
import { TechnospheresTableRenderer } from '../helpers/tables/technospheres-table-renderer.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { SETTINGS } from '../settings.js';
import { VehicleModuleTableRenderer } from '../helpers/tables/vehicle-module-table-renderer.mjs';

/**
 * @property {FUActor} actor
 * @extends {FUActorSheet}
 */
export class FUStashSheet extends FUActorSheet {
	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['stash'],
		resizable: true,
		window: {
			icon: 'fas fa-box-open',
		},
		position: { width: 600, height: 768 },
		dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
		actions: {
			editItem: this.#onEdit,
			roll: this.#onRoll,
			clearInventory: this.#onClearInventory,
			lootItem: this.#onLootItem,
			sellItem: this.#onSellItem,
			buyItem: this.#onBuyItem,
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
	#technospheresTable = new TechnospheresTableRenderer();
	#treasuresTable = new TreasuresTableRenderer();
	#consumablesTable = new ConsumablesTableRenderer();
	#vehicleModulesTable = new VehicleModuleTableRenderer({ hideIfEmpty: true });
	#otherItemsTable = new OtherItemsTableRenderer({
		excludedTypes: ['accessory', 'armor', 'consumable', 'shield', 'treasure', 'weapon', 'customWeapon'],
		excludedFeatureTypes: [FU.classFeatures.armorModule, FU.classFeatures.weaponModule, FU.classFeatures.supportModule],
	});

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
		const technoSphereMode = game.settings.get(SYSTEM, SETTINGS.technospheres);
		context.equipmentTable = await this.#equipmentTable.renderTable(this.document);
		if (technoSphereMode) {
			context.technospheresTable = await this.#technospheresTable.renderTable(this.document);
		}
		context.vehicleModulesTable = await this.#vehicleModulesTable.renderTable(this.document);
		context.treasuresTable = await this.#treasuresTable.renderTable(this.document);
		context.consumablesTable = await this.#consumablesTable.renderTable(this.document);
		context.otherItemsTable = await this.#otherItemsTable.renderTable(this.document, { exclude: technoSphereMode ? ['hoplosphere', 'mnemosphere'] : [] });
		return context;
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.#equipmentTable.activateListeners(this);
		this.#vehicleModulesTable.activateListeners(this);
		this.#technospheresTable.activateListeners(this);
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

	static #onLootItem(event, target) {
		return ActorSheetUtils.lootItem(event, target, this.actor);
	}

	static #onSellItem(event, target) {
		const item = ActorSheetUtils.resolveItem(this.actor, target);
		if (item) {
			return InventoryPipeline.tradeItem(this.actor, item, 'sell');
		}
	}

	static #onBuyItem(event, target) {
		const item = ActorSheetUtils.resolveItem(this.actor, target);
		if (item) {
			return InventoryPipeline.requestTrade(this.actor.uuid, item.uuid, true, undefined);
		}
	}

	static #onDistributeZenit() {
		return InventoryPipeline.distributeZenit(this.actor);
	}

	static #onRechargeInventoryPoints() {
		return InventoryPipeline.requestRecharge(this.actor);
	}
}
