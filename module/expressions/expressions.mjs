import { FU } from '../helpers/config.mjs';
import { ImprovisedEffect } from '../helpers/improvised-effect.mjs';
import { MathHelper } from '../helpers/math-helper.mjs';

/**
 * @description Contains contextual objects used for evaluating expressions
 * @property {FUActor} actor
 * @property {FUItem} item
 * @property {FUActor[]} targets
 */
export class ExpressionContext {
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
 * @param expression The raw text of the amount
 * @returns {boolean} True if the expression requires a context to be evaluated
 */
function requiresContext(expression) {
	return !Number.isInteger(Number(expression));
}

/**
 * @description Evaluates the given expression using the supported DSL
 * @param {String} expression
 * @param {ExpressionContext} context
 * @return {Number} The evaluated amount
 */
function evaluate(expression, context) {
	if (!requiresContext(expression)) {
		return Number(expression);
	}

	// TODO: Provide a system of hooks
	// Evaluate the expression's variables
	let substitutedExpression = evaluateProperties(expression, context);
	substitutedExpression = evaluateFunctions(substitutedExpression, context);
	// Now that the expression's variables have been substituted, evaluate it arithmetically
	const result = MathHelper.evaluate(substitutedExpression);

	if (Number.isNaN(result)) {
		throw new Error(`Failed to evaluate expression ${substitutedExpression}`);
	}

	console.debug(`Evaluated expression ${expression} = ${substitutedExpression} = ${result}`);
	return result;
}

/**
 * Evaluates functions within the expression using the available context
 * @param {String}  expression
 * @param {ExpressionContext} context
 * @returns {String}
 */
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

/**
 * Evaluates properties  within the expression using the available context
 * @param {String}  expression
 * @param {ExpressionContext} context
 * @returns {String}
 */
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

export const Expressions = {
	evaluate,
	requiresContext,
	getFunctionFromPath,
	getPropertyValueByPath,
};
