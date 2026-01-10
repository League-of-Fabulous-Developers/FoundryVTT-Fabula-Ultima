import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { Expressions } from '../expressions/expressions.mjs';
import { ChatMessageHelper } from './chat-message-helper.mjs';
import FoundryUtils from './foundry-utils.mjs';

/**
 * @description Information about a lookup for the source of an inline element
 * @property {String} name
 * @property {String} itemUuid
 * @property {String} actorUuid
 * @property {String} effectUuid
 * @property {String} fuid If an item is provided.
 */
export class InlineSourceInfo {
	constructor(name, actorUuid, itemUuid, effectUuid, fuid) {
		this.name = name;
		this.actorUuid = actorUuid;
		this.itemUuid = itemUuid;
		this.effectUuid = effectUuid;
		this.fuid = fuid;
	}

	/**
	 * @param {FUActor} actor
	 * @param {FUItem} item
	 * @param {String} name
	 * @return {InlineSourceInfo}
	 */
	static fromInstance(actor, item, name = undefined) {
		if (actor) {
			if (item) {
				return new InlineSourceInfo(name ?? item.name, actor.uuid, item.uuid);
			}
			return new InlineSourceInfo(name ?? actor.name, actor.uuid, null);
		} else if (item) {
			return new InlineSourceInfo(name ?? item.name, null, item.uuid);
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
	let fuid = element?.dataset?.fuid;

	// ACTOR SHEET
	if (document instanceof FUActor) {
		actorUuid = document.uuid;
		console.debug(`Determining source document as Actor ${actorUuid}`);
		const itemElement = element.closest('[data-item-id]');
		const itemId = itemElement?.dataset.itemId;
		if (itemId) {
			let item = document.items.get(itemId);
			if (!item) {
				const uuid = itemElement.dataset.uuid;
				if (uuid) {
					item = fromUuidSync(uuid);
				}
			}
			if (item) {
				itemUuid = item.uuid;
				fuid ??= item.system.fuid;
				name = item.name;
			}
		} else {
			name = document.name;
		}
		const effectElement = element.closest('[data-effect-id]');
		const effectId = effectElement?.dataset.effectId;
		if (effectId) {
			let effect = document.effects.get(effectId);
			if (!effect) {
				const uuid = effectElement.dataset.uuid;
				if (uuid) {
					effect = fromUuidSync(uuid, { strict: false });
				}
			}
			if (effect) {
				effectUuid = effect.uuid;
				fuid ??= effect.system.fuid;
			}
		}
	} // ITEM SHEET
	else if (document instanceof FUItem) {
		name = document.name;
		itemUuid = document.uuid;
		fuid ??= document.system.fuid;
		if (document.isEmbedded) {
			actorUuid = document.actor.uuid;
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
		// If an item reference was provided
		const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (item) {
			if (FoundryUtils.isUUID(item)) {
				itemUuid = item;
			} else {
				// It's possible the dispatcher didn't encode this information
				if (item.name) {
					name = item.name;
				}
				itemUuid = item.uuid;
			}
		}
		// Get the item from the check data
		else {
			const check = document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			if (check) {
				itemUuid = check.itemUuid;
				if (check.itemName) {
					name = check.itemName;
				}
			}
		}
		// Could come from an effect
		const effect = document.getFlag(SYSTEM, Flags.ChatMessage.Effect);
		if (effect) {
			effectUuid = effect;
		}
		console.debug(`Determining source document as ChatMessage ${name}`);
	}

	// TODO: Figure out which case triggers this
	// FALLBACK
	const chatItemText = element.closest('#chat-item-text');
	if (chatItemText) {
		if (chatItemText.dataset.actorUuid) {
			itemUuid = chatItemText.dataset.actorUuid;
		}
		if (chatItemText.dataset.itemId) {
			itemUuid = chatItemText.dataset.itemId;
		}
	}

	return new InlineSourceInfo(name, actorUuid, itemUuid, effectUuid, fuid);
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
	const content = dynamicAmount ? game.i18n.localize(localization) : expression;
	const span = document.createElement('span');
	span.textContent = content;
	//span.style.marginLeft = span.style.marginRight = '2px';
	anchor.appendChild(span);
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
 * @property {DOMStringMap} dataset
 */

/**
 * @param {HTMLEnrichedContentElement} element
 * @returns InlineRenderContext
 */
function getRenderContext(element) {
	const document = InlineHelper.resolveDocument(element);
	const target = element.firstElementChild;

	let sourceInfo;
	if (document instanceof ChatMessage) {
		sourceInfo = document.getFlag(SYSTEM, Flags.ChatMessage.Source);
	}
	if (!sourceInfo) {
		sourceInfo = InlineHelper.determineSource(document, target);
	}

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

/**
 * @param {HTMLElement} anchor
 * @param {String} path
 * @param {Number} size
 * @param margin
 * @returns {HTMLImageElement}
 */
function appendImage(anchor, path, size = 16, margin = true) {
	const img = document.createElement('img');
	img.src = path;
	img.width = size;
	img.height = size;
	if (margin) {
		img.style.marginLeft = '2px';
		img.style.marginRight = '4px';
	}
	anchor.append(img);
	return img;
}

/**
 * @param {HTMLAnchorElement} anchor
 * @param {...string} classes
 */
function appendVectorIcon(anchor, ...classes) {
	const icon = document.createElement(`i`);
	icon.classList.add(`icon`, ...classes.flatMap((c) => c.split(/\s+/)));
	icon.style.marginLeft = '2px';
	anchor.append(icon);
	return icon;
}

/**
 * @param {HTMLAnchorElement} anchor
 * @param {String} name
 */
function appendIcon(anchor, name) {
	const icon = document.createElement(`i`);
	const className = FU.allIcon[name];
	icon.classList.add(`fu-icon--xs`, className);
	icon.style.marginLeft = icon.style.marginRight = '2px';
	anchor.append(icon);
	return icon;
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
 * @param {String} key The key of the property
 * @param {String} value The pattern for the value of the property
 * @returns {String}
 */
function propertyPattern(identifier, key, value) {
	return `(\\s+${key}:(?<${identifier}>${value}))?`;
}

const documentPropertyGroup = [propertyPattern('document', 'document', '[\\w.-]+'), propertyPattern('propertyPath', 'propertyPath', '[\\w.-]+'), propertyPattern('index', 'index', '\\d')];

/**
 * @param {FUItem} item
 * @returns {string}
 */
function resolveItemGroup(item) {
	let source;
	if (item) {
		/** @type ItemType **/
		switch (item.type) {
			case 'spell':
				source = 'spell';
				break;
			case 'basic':
			case 'weapon':
			case 'customWeapon':
				source = 'attack';
				break;
			case 'skill':
			case 'optionalFeature':
			case 'classFeature':
			case 'miscAbility':
				source = 'skill';
				break;
			case 'consumable':
				source = 'item';
				break;
		}
	}
	return source;
}

export const InlineHelper = {
	determineSource,
	appendAmountToAnchor,
	appendImage,
	appendVectorIcon,
	appendIcon,
	appendVariableToAnchor,
	registerCommand,
	compose,
	propertyPattern,
	resolveDocument,
	getRenderContext,
	documentPropertyGroup,
	resolveItemGroup,
};
