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
		this.targets = targets;
	}
}

// DSL supported by the inline amount expression
const referenceSymbol = '@';
const actorLabel = `actor`;
const itemLabel = `item`;

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
	 * @param {HTMLAnchorElement} anchor
	 * @param {String} amount
	 */
	static appendToAnchor(anchor, amount) {
		anchor.dataset.amount = amount;
		const dynamicAmount = InlineAmount.isDynamic(amount);
		if (dynamicAmount) {
			anchor.append(game.i18n.localize('FU.Variable'));
		} else {
			anchor.append(amount);
		}
	}

	/**
	 * @param {InlineContext} context
	 * @return {Number} The evaluated amount
	 */
	evaluate(context) {
		if (!this.dynamic) {
			return Number(this.text);
		}

		let expression = this.text;

		// Evaluate the expression
		let substitutedExpression = evaluateProperties(expression, context);
		substitutedExpression = evaluateFunctions(substitutedExpression, context);
		const result = MathHelper.evaluate(substitutedExpression);

		if (Number.isNaN(result)) {
			throw new Error(`Failed to evaluate expresson ${substitutedExpression}`);
		}

		console.info(`Substituted expression ${expression} > ${substitutedExpression} > ${result}`);
		return result;
	}
}

function evaluateFunctions(expression, context) {
	const pattern = /\$(?<label>[a-zA-Z]+)\.(?<path>(\w+\.?)+)\((?<args>.*?)\)/gm;
	function evaluate(match, label, path, p3, args, groups) {
		if (match.includes(actorLabel)) {
			if (context.actor == null) {
				ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
				throw new Error(`No reference to an actor provided for "${match}"`);
			}

			let splitArgs = args.split(',');

			const functionPath = `system.${path}`;
			const resolvedFunction = getFunctionFromPath(context.actor, functionPath);
			if (resolvedFunction === undefined) {
				throw new Error(`No function in path "${functionPath}" of object ${context.actor}`);
			}
			const result = resolvedFunction.apply(context.actor.system, splitArgs);
			console.info(`Resolved function ${functionPath}: ${result}`);
			return result;
		}
	}
	return expression.replace(pattern, evaluate);
}

function evaluateProperties(expression, context) {
	const pattern = /(?<variable>@?([a-zA-Z]+\.?)+)/gm;
	function evaluate(match, label, path, pN, offset, string, groups) {
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
		}
		return match;
	}

	return expression.replace(pattern, evaluate);
}

/**
 * @param obj The object to resolve the function  from
 * @param path The path to the function, in dot notation
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
			throw new Error(`Path not found in ${obj}: ${path}`);
		}
		current = current[part];
	}

	if (typeof current !== 'function') {
		throw new Error(`Path does not resolve to a function: ${path}`);
	}

	return current;
}

/**
 * @param obj The object to resolve the property from
 * @param path The path to the property, in dot notation
 * @returns {undefined|*} The value of the property
 */
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

	// TODO: Make sure item always gets resolved
	const itemId = $(element).closest('[data-item-id]').data('itemId');

	if (document instanceof FUActor) {
		actor = document;
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
	getFunctionFromPath,
	determineSource,
};
