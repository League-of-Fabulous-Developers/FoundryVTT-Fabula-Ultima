import { SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { Expressions } from '../expressions/expressions.mjs';
import { ChatMessageHelper } from './chat-message-helper.mjs';

/**
 * @description Information about a lookup for the source of an inline element
 * @property {String} name
 * @property {String} itemUuid
 * @property {String} actorUuid
 * @property {String} effectUuid
 */
export class InlineSourceInfo {
	constructor(name, actorUuid, itemUuid, effectUuid) {
		this.name = name;
		this.actorUuid = actorUuid;
		this.itemUuid = itemUuid;
		this.effectUuid = effectUuid;
	}

	/**
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @return {InlineSourceInfo}
	 */
	static fromInstance(actor, item) {
		if (actor) {
			if (item) {
				return new InlineSourceInfo(item.name, actor.uuid, item.uuid);
			}
			return new InlineSourceInfo(actor.name, actor.uuid, null);
		} else if (item) {
			return new InlineSourceInfo(item.name, null, item.uuid);
		}
	}

	/**
	 * @param {String} actorUuid
	 * @param {String} itemUuid
	 * @return {InlineSourceInfo}
	 */
	static resolveName(actorUuid, itemUuid) {
		const resolvedModel = fromUuidSync(itemUuid ?? actorUuid);
		return new InlineSourceInfo(resolvedModel.name, actorUuid, itemUuid);
	}

	/**
	 * @description Used for reconstruction during deserialization
	 * @param {Object} obj An object containing the properties of this class
	 * @returns {InlineSourceInfo}
	 */
	static fromObject(obj) {
		return new InlineSourceInfo(obj.name, obj.actorUuid, obj.itemUuid);
	}

	/**
	 * @returns {FUActor|null}
	 */
	resolveActor() {
		if (this.actorUuid) {
			return fromUuidSync(this.actorUuid);
		}
		return null;
	}

	/**
	 * @returns {FUItem|null}
	 */
	resolveItem() {
		if (this.itemUuid) {
			return fromUuidSync(this.itemUuid);
		}
		return null;
	}

	/**
	 * @returns {FUActiveEffect|null}
	 */
	resolveEffect() {
		if (this.effectUuid) {
			return fromUuidSync(this.effectUuid);
		}
		return null;
	}

	/**
	 * @returns {FUActor|FUItem}
	 */
	resolve() {
		if (this.actorUuid) {
			return fromUuidSync(this.actorUuid);
		}
		if (this.itemUuid) {
			return fromUuidSync(this.itemUuid);
		}
		return null;
	}

	/**
	 * @returns {String} The uuid of the item, or the actor
	 */
	get uuid() {
		if (this.itemUuid) {
			return this.itemUuid;
		}
		return this.actorUuid;
	}

	/**
	 * @returns {Boolean}
	 */
	get hasEffect() {
		return !!this.effectUuid;
	}

	/**
	 * @returns {Boolean}
	 */
	get hasItem() {
		return !!this.itemUuid;
	}

	static none = Object.freeze(new InlineSourceInfo('Unknown'));
}

/**
 * @description Attempts to determine the item/actor source within an html element
 * @param {Document} document
 * @param {HTMLElement} element
 * @returns {InlineSourceInfo}
 */
function determineSource(document, element) {
	let name = game.i18n.localize('FU.UnknownDamageSource');
	let itemUuid = null;
	let actorUuid = null;
	let effectUuid = null;

	// ACTOR SHEET
	if (document instanceof FUActor) {
		actorUuid = document.uuid;
		console.debug(`Determining source document as Actor ${actorUuid}`);
		const itemId = element.closest('[data-item-id]')?.dataset?.itemId;
		if (itemId) {
			let item = document.items.get(itemId);
			itemUuid = item.uuid;
			name = item.name;
		} else {
			name = document.name;
		}
		const effectId = element.closest('[data-effect-id]')?.dataset?.effectId;
		if (effectId) {
			const effect = document.effects.get(effectId);
			if (effect) {
				effectUuid = effect.uuid;
			}
		}
	} // ITEM SHEET
	else if (document instanceof FUItem) {
		name = document.name;
		itemUuid = document.uuid;
		if (document.isEmbedded) {
			actorUuid = document.parent.uuid;
		}
		console.debug(`Determining source document as Item ${itemUuid}`);
	}
	// CHAT MESSAGE
	else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			actorUuid = speakerActor.uuid;
			name = speakerActor.name;
		}
		const check = document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
		if (check) {
			itemUuid = check.itemUuid;
			if (check.itemName) {
				name = check.itemName;
			}
		} else {
			// No need to check 'instanceof FUItem;
			const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
			if (item) {
				// It's possible the dispatcher didn't encode this information
				if (item.name) {
					name = item.name;
				}
				itemUuid = item.uuid;
			}
			// Could come from an effect
			const effect = document.getFlag(SYSTEM, Flags.ChatMessage.Effect);
			if (effect) {
				effectUuid = effect;
			}
		}

		console.debug(`Determining source document as ChatMessage ${name}`);
	}
	return new InlineSourceInfo(name, actorUuid, itemUuid, effectUuid);
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

/**
 * @param {HTMLAnchorElement} anchor
 * @param {String} key The key in the `anchor.dataset`
 * @param {String} expression
 * @param {String} localization
 */
function appendVariableToAnchor(anchor, key, expression, localization = 'FU.Variable') {
	anchor.dataset[key] = expression;
	const dynamicAmount = Expressions.requiresContext(expression);
	if (dynamicAmount) {
		anchor.append(game.i18n.localize(localization));
	} else {
		anchor.append(expression);
	}
}

function toBase64(value) {
	try {
		const string = JSON.stringify(value);
		const bytes = new TextEncoder().encode(string);
		const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
		return btoa(binString);
	} catch (e) {
		return null;
	}
}

function fromBase64(base64) {
	try {
		const binString = atob(base64);
		const uint8Array = Uint8Array.from(binString, (m) => m.codePointAt(0));
		const decodedValue = new TextDecoder().decode(uint8Array);
		return JSON.parse(decodedValue);
	} catch (e) {
		return null;
	}
}

/**
 * @typedef InlineEventListener
 * @param {ChatMessage|Document} document  The ChatMessage document being rendered.
 * @param {HTMLElement} html     The pending HTML.
 */

/**
 * @type {FUInlineCommand[]}
 */
let inlineCommands = [];

/**
 * @typedef FUInlineCommand
 * @property {TextEditorEnricherConfig[]} enrichers
 * @property onDropActor
 */

/**
 * @typedef InlineRenderContext
 * @property {Document} document
 * @property {HTMLElement} target
 * @property {InlineSourceInfo} sourceInfo
 * @property {Object} dataset
 */

/**
 * @param {HTMLEnrichedContentElement} element
 * @returns InlineRenderContext
 */
function getRenderContext(element) {
	const document = InlineHelper.resolveDocument(element);
	const target = element.firstElementChild;
	const sourceInfo = InlineHelper.determineSource(document, target);
	const dataset = target.dataset;
	return {
		document,
		target,
		sourceInfo,
		dataset,
	};
}

/**
 * @param {FUInlineCommand} command
 */
function registerCommand(command) {
	inlineCommands.push(command);
	if (command.onDropActor) {
		Hooks.on('dropActorSheetData', command.onDropActor);
	}
	CONFIG.TextEditor.enrichers.push(...command.enrichers);
}

/**
 * @description Resolves the parent document from where an enriched html element came from
 * @param {HTMLEnrichedContentElement} element
 * @returns {Document|ChatMessage}
 */
function resolveDocument(element) {
	const chatMessage = element.closest('li.chat-message');
	if (chatMessage) {
		const messageId = chatMessage.dataset.messageId;
		const message = ChatMessageHelper.fromId(messageId);
		return message;
	} else {
		let sheet;
		const framev2 = element.closest('.application');
		if (framev2) {
			sheet = foundry.applications.instances.get(framev2.id);
		} else {
			const framev1 = element.closest('.app');
			if (framev1) {
				sheet = ui.windows[framev1.dataset.appid];
			}
		}
		if (sheet) {
			return sheet.document;
		}
	}
	console.debug(`Failed to resolve the document from ${element.toString()}`);
}

function appendImageToAnchor(anchor, path) {
	const img = document.createElement('img');
	img.src = path;
	img.width = 16;
	img.height = 16;
	img.style.marginLeft = img.style.marginRight = '2px';
	anchor.append(img);
}

/**
 * @param {String} name The name of the command
 * @param {String} required
 * @param {String[]|null} optional
 * @returns {RegExp} A regex to be used within an enricher
 * @remarks Expects regex sub-patterns to be already escaped
 * @remarks Automatically adds support for the following groups: `label` (String), `traits` (String[]).
 */
function compose(name, required, optional = undefined) {
	const joinedOptional = optional ? optional.join('') : '';
	const pattern = `@${name}\\[${required}${joinedOptional}${traitsPattern}\\]${labelPattern}`;
	return new RegExp(pattern, 'g');
}

/**
 * @type {string} The pattern used for optional labeling
 */
const labelPattern = '(\\{(?<label>.*?)\\})?';

/**
 * @type {string} The pattern used for optional traits
 */
const traitsPattern = '(\\|(?<traits>[a-zA-Z-,]+)\\|)?';

/**
 * @param {String} identifier The name of the regex group
 * @param key The key of the property
 * @param value The value of the property
 * @returns {String}
 */
function propertyPattern(identifier, key, value) {
	return `(\\s+${key}:(?<${identifier}>${value}))?`;
}

export const InlineHelper = {
	determineSource,
	appendAmountToAnchor,
	appendImageToAnchor,
	appendVariableToAnchor,
	toBase64,
	fromBase64,
	registerCommand,
	compose,
	propertyPattern,
	resolveDocument,
	getRenderContext,
};
