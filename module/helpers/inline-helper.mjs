import { SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { Expressions } from '../expressions/expressions.mjs';

/**
 * @description Information about a lookup for the source of an inline element
 * @property {String} name
 * @property {Number} uuid
 * @property {FUActor} actor
 * @property {FUItem} item
 */
export class InlineSourceInfo {
	constructor(name, uuid, actor, item) {
		this.name = name;
		this.uuid = uuid;
		this.actor = actor;
		this.item = item;
	}
}

/**
 * @description Attempts to determine the item/actor source within an html element
 * @param {Document} document
 * @param {HTMLElement} element
 * @returns {InlineSourceInfo}
 */
async function determineSource(document, element) {
	let name = game.i18n.localize('FU.UnknownDamageSource');
	let uuid = null;
	let actor = undefined;
	let item = null;

	if (document instanceof FUActor) {
		actor = document;
		const itemId = $(element).closest('[data-item-id]').data('itemId');
		if (itemId) {
			item = document.items.get(itemId);
			name = item.name;
			uuid = item.uuid;
		} else {
			name = document.name;
			uuid = document.uuid;
		}
	} else if (document instanceof FUItem) {
		item = document;
		name = document.name;
		uuid = document.uuid;
	} else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			actor = speakerActor;
			name = speakerActor.name;
			uuid = speakerActor.uuid;
		}
		const check = document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
		if (check) {
			const itemUuid = check.itemUuid;
			item = await fromUuid(itemUuid);
		} else {
			item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
			if (item) {
				name = item.name;
				uuid = item.uuid;
			}
		}
	}

	// TODO: Make sure item always gets resolved
	return new InlineSourceInfo(name, uuid, actor, item);
}

/**
 * @param {HTMLAnchorElement} anchor
 * @param {String} amount
 */
function appendAmountToAnchor(anchor, amount) {
	anchor.dataset.amount = amount;
	const dynamicAmount = Expressions.requiresContext(amount);
	if (dynamicAmount) {
		anchor.append(game.i18n.localize('FU.Variable'));
	} else {
		anchor.append(amount);
	}
}

export const InlineHelper = {
	determineSource,
	appendAmountToAnchor,
};
