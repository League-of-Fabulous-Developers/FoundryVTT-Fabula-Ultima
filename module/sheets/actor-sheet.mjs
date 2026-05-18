import { PseudoDocument } from '../documents/pseudo/pseudo-document.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { ItemSelectionDialog } from '../ui/features/item-selection-dialog.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';
import { createMenuTool, SETTINGS } from '../settings.js';
import { SYSTEM } from '../helpers/config.mjs';
import { InventoryPipeline } from '../pipelines/inventory-pipeline.mjs';

const { api, sheets } = foundry.applications;

/**
 * @property {HTMLElement} element
 * @property {FUActor} actor
 */
export class FUActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu', 'sheet', 'actor', 'projectfu-actor-sheet', 'sheet-content-wrapper', 'h-100', 'backgroundstyle'],
		scrollY: ['.sheet-body'],
		window: {
			icon: 'fas fa-person',
			resizable: true,
			controls: [
				{
					action: 'migrateItems',
					icon: 'fa-regular fa-refresh',
					label: 'FU.CompendiumMigrateActorItems',
					ownership: 'OWNER',
				},
				{
					action: 'configureSheetOptions',
					icon: 'fas fa-book',
					label: 'FU.SheetOptions',
					ownership: 'OWNER',
					visible: () => {
						return game.user.isGM;
					},
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		actions: {
			migrateItems: this.#migrateItems,
			configureSheetOptions: this.#configureSheetOptions,
			addArrayElement: this.#addArrayElement,
			removeArrayElement: this.#removeArrayElement,
		},
	};

	_onRender(context, options) {
		super._onRender(context, options);
		HTMLUtils.setupInputs(this.element);
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.element.classList.add(this.actor.type);
	}

	_attachFrameListeners() {
		super._attachFrameListeners();
		this.element.addEventListener('auxclick', this.#onAuxClick.bind(this));
		this.element.addEventListener('mousedown', (ev) => {
			if (ev.button === 1) {
				// prevent "scroll nub" from showing up
				ev.preventDefault();
			}
		});
	}

	/**
	 * @param {PointerEvent} event
	 */
	async #onAuxClick(event) {
		if (event.button === 1) {
			const target = event.target;
			let item = this.actor.items.get(target.closest('[data-item-id]')?.dataset?.itemId);

			if (!item) {
				item = await foundry.utils.fromUuid(target.closest('[data-uuid]')?.dataset?.uuid);
			}

			if (item) {
				item.sheet.render(true);
			}
		}
	}

	/**
	 * @override
	 */
	_onClickAction(event, target) {
		if (target.closest('prose-mirror') || !target.closest('body')) {
			// prose mirror action button
			return;
		}

		if (this.#dispatchClickActionToItem(event, target)) {
			event.stopPropagation();
			event.preventDefault();
			return;
		}

		console.warn('Unhandled action:', target.dataset.action, event, target);
	}

	/**
	 * Because we need to conform to Foundry API definition we can not make this method or its parent '_onClickAction' async.
	 * That unfortunately means that dispatching click actions to deeply nested items will _not_ work for actors in compendiums.
	 *
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 * @return {boolean}
	 */
	#dispatchClickActionToItem(event, target) {
		let success = false;

		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item;

		if (itemId) {
			item = this.actor.items.get(itemId);
		}

		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			// see jsdoc comment
			item = foundry.utils.fromUuidSync(uuid, { strict: true });
		}

		if (item && item.system[target.dataset.action] instanceof Function) {
			item.system[target.dataset.action](event, target);
			success = true;
		} else if (item && ['classFeature', 'optionalFeature'].includes(item.type)) {
			if (item.system.data[target.dataset.action] instanceof Function) {
				item.system.data[target.dataset.action](event, target);
				success = true;
			}
		}

		return success;
	}

	async _onDropItem(event, item) {
		if (item instanceof PseudoDocument && item.parentFoundryDocument?.parent === this.actor) {
			const result = await this._onSortItem(event, item);
			return result?.length ? item : null;
		}

		if (item instanceof foundry.documents.Item && item.parent && item.parent !== this.actor) {
			const isShop = item.parent.type === 'stash' && item.parent.system.merchant;
			return InventoryPipeline.requestTrade(item.parent.uuid, item.uuid, isShop, this.actor.uuid);
		}

		return super._onDropItem(event, item);
	}

	async _onSortItem(event, item) {
		const { fromUuid } = foundry.utils;
		const source = await fromUuid(item.uuid);

		// Confirm the drop target
		const dropTarget = event.target.closest('[data-uuid]');
		if (!dropTarget) return;
		const target = await fromUuid(dropTarget.dataset.uuid);
		if (source.uuid === target.uuid) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (const element of dropTarget.parentElement.children) {
			const siblingId = element.dataset.uuid;
			if (siblingId && siblingId !== source.uuid) siblings.push(await fromUuid(element.dataset.uuid));
		}

		// Perform the sort
		const sortUpdates = foundry.utils.performIntegerSort(source, { target, siblings });
		sortUpdates.sort((a, b) => b.target.uuid.length - a.target.uuid.length);
		for (let { target, update } of sortUpdates) {
			await target.update(update);
		}
		return sortUpdates.map((value) => value.target);
	}

	/**
	 * @this FUActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #migrateItems(event, target) {
		/** @type FUItem[] **/
		let items = Array.from(this.actor.items.values()).sort((a, b) => a.name.localeCompare(b.name));
		/** @type ItemMigrationAction[] **/
		const updates = await FoundryUtils.getItemMigrationActions(items);

		if (updates.length > 0) {
			const message = StringUtils.localize('FU.CompendiumMigrateActorItemsMessage', {
				count: updates.length,
			});

			items = updates.map((upd) => upd.item);
			const compendiumItems = updates.map((upd) => upd.compendiumItem);

			// TODO: Custom table?
			const title = 'FU.CompendiumMigrateActorItems';
			/** @type ItemSelectionData **/
			const data = {
				title: title,
				message,
				style: 'list',
				items: items,
				compendiumItems: compendiumItems,
				getDescription: async (item) => {
					const text = item.system?.description ?? '';
					return text;
				},
			};
			const dialog = new ItemSelectionDialog(data);
			const result = await dialog.open();
			if (result && result.length > 0) {
				const uuids = new Set(result.map((item) => item.uuid));
				const selectedUpdates = updates.filter((u) => uuids.has(u.item.uuid)).map((u) => u.procedure);
				await Promise.all(selectedUpdates.map((fn) => fn()));
				ui.notifications.info(StringUtils.localize('FU.CompendiumMigrateSuccess', { count: selectedUpdates.length }));
			}
		}
	}

	/**
	 * @this FUActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #addArrayElement(event, target) {
		const path = target.dataset.path;
		if (path) {
			const array = ObjectUtils.getProperty(this.actor, path);
			if (array) {
				array.push(null);
				await this.actor.update({
					[`${path}`]: array,
				});
			}
		}
	}

	/**
	 * @this FUActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #removeArrayElement(event, target) {
		const { path, prompt, label } = target.dataset;
		const index = Number.parseInt(target.dataset.index);
		if (path) {
			if (prompt) {
				const confirm = await FoundryUtils.confirmDialog(StringUtils.localize(`FU.Remove`), StringUtils.localize('FU.DialogRemoveMessage', { label: label ?? 'FU.Entry' }));
				if (!confirm) {
					return;
				}
			}
			/** @type [] **/
			const array = ObjectUtils.getProperty(this.actor, path);
			if (array && index !== undefined) {
				array.splice(index, 1);
				await this.actor.update({
					[`${path}`]: array,
				});
			}
		}
	}

	/**
	 * @this FUActorSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #configureSheetOptions(event, target) {
		const tool = createMenuTool(`${SYSTEM}.${SETTINGS.sheetOptions}`);
		tool.click();
	}
}
