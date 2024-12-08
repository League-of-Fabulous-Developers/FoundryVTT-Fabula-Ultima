import { SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';

/**
 * Information about a lookup for the source of an inline element
 */
export class InlineSourceInfo {
	constructor(name, uuid, actor) {
		this._name = name;
		this._uuid = uuid;
		this._actor = actor;
	}
	get actor() {
		return this._actor;
	}
	get uuid() {
		return this._uuid;
	}
	get name() {
		return this._name;
	}
}

/**
 * @param {Document} document
 * @param {HTMLElement} element
 * @returns {InlineSourceInfo}
 */
function determineSource(document, element) {
	let name = game.i18n.localize('FU.UnknownDamageSource');
	let uuid = null;
	let actor = undefined;

	if (document instanceof FUActor) {
		actor = document;
		const itemId = $(element).closest('[data-item-id]').data('itemId');
		if (itemId) {
			const item = document.items.get(itemId);
			name = item.name;
			uuid = item.uuid;
		} else {
			name = document.name;
			uuid = document.uuid;
		}
	} else if (document instanceof FUItem) {
		name = document.name;
		uuid = document.uuid;
	} else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			actor = speakerActor;
			name = speakerActor.name;
			uuid = speakerActor.uuid;
		}
		const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (item) {
			name = item.name;
			uuid = item.uuid;
		}
	}

	return new InlineSourceInfo(name, uuid, actor);
}

export const InlineHelper = {
	determineSource,
};
