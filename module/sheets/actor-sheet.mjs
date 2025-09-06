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
		},
		form: {
			submitOnChange: true,
		},
	};

	/**
	 * @override
	 */
	_onClickAction(event, target) {
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
}
