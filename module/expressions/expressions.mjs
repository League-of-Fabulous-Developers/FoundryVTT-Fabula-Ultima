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

// TODO: Provide a system of hooks
// Order of operations matters
const evaluationFunctions = [evaluateVariables, evaluateEffects, evaluateReferencedFunctions, evaluateReferencedProperties, evaluateMacros];

/**
 * @description Evaluates the given expression using the supported DSL
 * @param {String} expression
 * @param {ExpressionContext} context
 * @return {Number} The evaluated amount
 * @example (@actor.level.value*2+minor+@item.level.value)
 * @example @actor.byLevel(40,50,60)
 * @example (minor + 5)
 */
function evaluate(expression, context) {
	if (!requiresContext(expression)) {
		return Number(expression);
	}

	// Evaluate the expression's variables
	let substitutedExpression = expression;
	evaluationFunctions.forEach((evaluateFunction) => {
		substitutedExpression = evaluateFunction(substitutedExpression, context);
	});

	// Now that the expression's variables have been substituted, evaluate it arithmetically
	const result = MathHelper.evaluate(substitutedExpression);

	if (Number.isNaN(result)) {
		throw new Error(`Failed to evaluate expression ${substitutedExpression}`);
	}

	console.debug(`Evaluated expression ${expression} = ${substitutedExpression} = ${result}`);
	return result;
}

function assertActorInContext(context, match) {
	if (context.actor == null) {
		ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
		throw new Error(`No reference to an actor provided while evaluating "${match}"`);
	}
}

function assertItemInContext(context, match) {
	if (context.item == null) {
		ui.notifications.warn('FU.ChatEvaluateAmountNoItem', { localize: true });
		throw new Error(`No reference to an item provided while evaluating expression "${match}"`);
	}
}

/**
 * @description Evaluates functions within the expression using the available context
 * @param {String}  expression
 * @param {ExpressionContext} context
 * @returns {String}
 */
function evaluateReferencedFunctions(expression, context) {
	const pattern = /@(?<label>[a-zA-Z]+)\.(?<path>(\w+\.?)+)\((?<args>.*?)\)/gm;

	function evaluate(match, label, path, p3, args, groups) {
		if (match.includes(actorLabel)) {
			assertActorInContext(context, match);
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
 * @description Evaluates improvised effects
 * @param {String} expression
 * @param {ExpressionContext} context
 * @returns {String}
 */
function evaluateEffects(expression, context) {
	const pattern = /(minor)|(heavy)|(massive)/gm;
	function evaluate(match) {
		return ImprovisedEffect.calculateAmountFromContext(match, context);
	}
	return expression.replace(pattern, evaluate);
}

/**
 * @description Evaluates special variables
 * @param expression
 * @param context
 * @example $sl*10
 * @example $cl/2
 * */
function evaluateVariables(expression, context) {
	const pattern = /\$(?<symbol>\w+)/gm;
	function evaluate(match, symbol) {
		switch (symbol) {
			// TODO: TARGET number of status effects (throw if more than 1 selected?)
			// TODO: CHARACTER highest strength among bonds
			// TODO: CHARACTER number of bonds
			// Character level
			case 'cl':
				assertActorInContext(context, match);
				return context.actor.system.level.value;
			// Item level / skill level
			case 'il':
			case 'sl':
				assertItemInContext(context, match);
				return context.item.system.level.value;
			default:
				throw new Error(`Unsupported symbol ${symbol}`);
		}
	}
	return expression.replace(pattern, evaluate);
}

/**
 * @description Custom functions provided by the expression engine
 * @param expression
 * @param context
 * @returns {String}
 * @example &step(40,50,60)
 */
function evaluateMacros(expression, context) {
	const pattern = /&(?<name>[a-zA-Z]+)\((?<params>.*?)\)/gm;
	function evaluateMacro(match, name, params) {
		const splitArgs = params.split(',');
		switch (name) {
			// TODO: Level of named skill owned by actor
			case `sl`: {
				const skillName = splitArgs[0].match(/(\w+\s*)+/gm)[0];
				const skill = context.actor.getSingleItemByName(skillName, 'skill');
				if (!skill) {
					throw new Error(`The actor ${context.actor.name} does not have a skill named ${skillName}`);
				}
				return skill.system.level.value;
			}
			case 'step':
				assertActorInContext(context, match);
				return context.actor.system.byLevel.apply(context.actor.system, splitArgs);
			default:
				throw new Error(`Unsupported macro ${name}`);
		}
	}
	return expression.replace(pattern, evaluateMacro);
}

/**
 * Evaluates properties  within the expression using the available context
 * @param {String}  expression
 * @param {ExpressionContext} context
 * @returns {String}
 */
function evaluateReferencedProperties(expression, context) {
	const pattern = /(?<variable>@([a-zA-Z]+\.?)+)/gm;
	function evaluate(match, label, path, pN, offset, string, groups) {
		// TODO: Refactor
		let root = null;
		let propertyPath = '';

		if (match.includes(itemLabel)) {
			assertItemInContext(context, match);
			root = context.item;
			propertyPath = match.replace(`${referenceSymbol}${itemLabel}.`, 'system.');
		} else if (match.includes(actorLabel)) {
			assertActorInContext(context, match);
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
