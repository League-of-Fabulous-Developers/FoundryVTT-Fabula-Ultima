import { ActorSheetUtils } from './actor-sheet-utils.mjs';

/**
 * @property {FUActor} actor
 * @extends {ActorSheet}
 */
export class FUStashSheet extends ActorSheet {
	static get defaultOptions() {
		const defaultOptions = super.defaultOptions;
		return foundry.utils.mergeObject(defaultOptions, {
			classes: ['projectfu', 'sheet', 'actor', 'stash', 'backgroundstyle'],
			template: 'systems/projectfu/templates/actor/actor-stash-sheet.hbs',
			width: 600,
			height: 768,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'overview',
				},
			],
			scrollY: ['.sheet-body'],
			dragDrop: [{ dragSelector: '.item-list .item, .effects-list .effect', dropSelector: null }],
		});
	}

	/** @override */
	async getData() {
		// Enrich or transform data here
		const context = super.getData();
		await ActorSheetUtils.prepareData(context, this);
		return context;
	}

	/** @override */
	get template() {
		return `systems/projectfu/templates/actor/actor-stash-sheet.hbs`;
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		ActorSheetUtils.activateDefaultListeners(html, this);
		ActorSheetUtils.activateStashListeners(html, this);
		ActorSheetUtils.activateInventoryListeners(html, this);
	}

	/** @override */
	async _onDrop(ev) {
		ev.preventDefault();
		const data = TextEditor.getDragEventData(ev);
		if (data && data.type) {
			switch (data.type) {
				case 'Item': {
					const accepted = await ActorSheetUtils.handleInventoryItemDrop(this.actor, data, super._onDrop(ev));
					if (accepted) {
						return true;
					}
					break;
				}
			}
		}
		return false;
	}
}
