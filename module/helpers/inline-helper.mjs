import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { ImprovisedEffect } from './improvised-effect.mjs';
import { MathHelper } from './math-helper.mjs';

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
 * @property {FUActor} actor
 * @property {FUItem} item
 * @property {FUActor[]} targets
 */
export class InlineContext {
	constructor(actor, item, targets) {
		this.actor = actor;
		this.item = item;
		this.target = targets;
	}
}

// DSL supported by the inline amount expression
const referenceSymbol = '@';
const actorLabel = `actor`;
const itemLabel = `item`;
const functionSymbol = '$';

/**
 * @property {String} text The raw text
 * @property {Boolean} dynamic Whether the amount needs to be evaluated based on the context
 */
export class InlineAmount {
	constructor(text) {
		this.text = text;
		this.dynamic = InlineAmount.isDynamic(text);
	}

	/**
	 * @param text The raw text of the amount
	 * @returns {boolean} True if the amount is dynamic
	 */
	static isDynamic(text) {
		return !Number.isInteger(Number(text));
	}

	/**
	 * @param {InlineContext} context
	 * @return {Number} The evaluated amount
	 */
	evaluate(context) {
		if (!this.dynamic) {
			return Number(this.text);
		}

		// Match all the variables in the string
		const pattern = /(?<variable>[@|$]?([a-zA-Z]+\.?)+)/gm;
		let expression = this.text;

		// Evaluate the expression
		function evaluateVariable(match, p1, p2, /* …, */ pN, offset, string, groups) {
			// ImprovisedEffect
			if (match in FU.improvisedEffect) {
				return ImprovisedEffect.calculateAmountFromContext(match, context);
			}
			// Property Reference
			else if (match.includes(referenceSymbol)) {
				// TODO: Refactor
				let root = null;
				let propertyPath = '';

				if (match.includes(itemLabel)) {
					if (context.item == null) {
						ui.notifications.warn('FU.ChatEvaluateAmountNoItem', { localize: true });
						throw new Error(`No reference to an item provided for "${match}"`);
					}
					root = context.item;
					propertyPath = match.replace(`${referenceSymbol}${itemLabel}.`, 'system.');
				} else if (match.includes(actorLabel)) {
					if (context.actor == null) {
						ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
						throw new Error(`No reference to an actor provided for "${match}"`);
					}
					root = context.actor;
					propertyPath = match.replace(`${referenceSymbol}${actorLabel}.`, 'system.');
				}

				// Evaluate the property value
				const propertyValue = getPropertyValueByPath(root, propertyPath);
				if (propertyValue === undefined) {
					throw new Error(`Unexpected variable "${propertyPath}" in object ${root}`);
				}
				return propertyValue;
			} else if (match.includes(functionSymbol)) {
				if (match.includes(actorLabel)) {
					if (context.actor == null) {
						ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
						throw new Error(`No reference to an actor provided for "${match}"`);
					}

					const functionPath = match.replace(`${functionSymbol}${actorLabel}.`, `system.`);
					const resolvedFunction = getFunctionFromPath(context.actor, functionPath);
					console.info(`Resolved function path ${functionPath} = ${resolvedFunction}`);
				}
			}

			return match;
		}

		const substitutedExpression = expression.replace(pattern, evaluateVariable);
		const result = MathHelper.evaluate(substitutedExpression);

		if (Number.isNaN(result)) {
			throw new Error(`Failed to evaluate expresson ${substitutedExpression}`);
		}

		console.info(`Substituted expression ${expression} > ${substitutedExpression} > ${result}`);
		return result;
	}
}

/**
 * @param obj The object to resolve the function  from
 * @param path
 * @returns {Function} The resolved function
 */
function getFunctionFromPath(obj, path) {
	if (typeof path !== 'string') {
		throw new Error('Path must be a string');
	}
	if (typeof obj !== 'object' || obj === null) {
		throw new Error('Invalid object provided');
	}

	const parts = path.split('.');
	let current = obj;

	for (const part of parts) {
		if (current[part] === undefined) {
			throw new Error(`Path not found: ${path}`);
		}
		current = current[part];
	}

	if (typeof current !== 'function') {
		throw new Error(`Path does not resolve to a function: ${path}`);
	}

	return current;
}

function getPropertyValueByPath(obj, path) {
	const keys = path.split('.');
	let value = obj;

	for (let key of keys) {
		if (typeof value === 'object' && value !== null) {
			value = value[key];
		} else {
			return undefined;
		}
	}

	return value;
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
		item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (item) {
			name = item.name;
			uuid = item.uuid;
		}
	}

	return new InlineSourceInfo(name, uuid, actor, item);
}

export const InlineHelper = {
	getPropertyValueByPath,
	determineSource,
};
