import { PseudoDocument } from '../documents/pseudo/pseudo-document.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { ItemSelectionDialog } from '../ui/features/item-selection-dialog.mjs';

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
			resizable: true,
			controls: [
				{
					action: 'migrateItems',
					icon: 'fa-regular fa-refresh',
					label: 'FU.CompendiumMigrateActorItems',
					ownership: 'OWNER',
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		actions: {
			migrateItems: this.#migrateItems,
		},
	};

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
	#onAuxClick(event) {
		if (event.button === 1) {
			const target = event.target;
			let item = this.actor.items.get(target.closest('[data-item-id]')?.dataset?.itemId);

			if (!item) {
				item = foundry.utils.fromUuidSync(target.closest('[data-uuid]')?.dataset?.uuid);
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

	#dispatchClickActionToItem(event, target) {
		let success = false;

		const itemId = target.closest('[data-item-id]')?.dataset?.itemId;
		let item;

		if (itemId) {
			item = this.actor.items.get(itemId);
		}

		if (!item) {
			const uuid = target.closest('[data-uuid]')?.dataset?.uuid;
			item = foundry.utils.fromUuidSync(uuid);
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

		return super._onDropItem(event, item);
	}

	async _onSortItem(event, item) {
		const { fromUuidSync } = foundry.utils;
		const source = fromUuidSync(item.uuid);

		// Confirm the drop target
		const dropTarget = event.target.closest('[data-uuid]');
		if (!dropTarget) return;
		const target = fromUuidSync(dropTarget.dataset.uuid);
		if (source.uuid === target.uuid) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (const element of dropTarget.parentElement.children) {
			const siblingId = element.dataset.uuid;
			if (siblingId && siblingId !== source.uuid) siblings.push(fromUuidSync(element.dataset.uuid));
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
		const items = Array.from(this.actor.items.values());
		/** @type ItemMigrationAction[] **/
		const updates = await FoundryUtils.getItemMigrationActions(items);

		if (updates.length > 0) {
			const message = StringUtils.localize('FU.CompendiumMigrateActorItemsMessage', {
				count: updates.length,
			});

			const title = 'FU.CompendiumMigrateActorItems';
			/** @type ItemSelectionData **/
			const data = {
				title: title,
				message,
				style: 'list',
				items: items,
				initial: items,
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
}
