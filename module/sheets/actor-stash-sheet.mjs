import { ActorSheetUtils } from './actor-sheet-utils.mjs';
import { FUActorSheet } from './actor-sheet.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';

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

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		const html = this.element;
		ActorSheetUtils.activateDefaultListeners(html, this);
		ActorSheetUtils.activateStashListeners(html, this);
		ActorSheetUtils.activateInventoryListeners(html, this);
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		await ActorSheetUtils.prepareData(context, this);
		await ActorSheetUtils.prepareInventory(context);
		return context;
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
