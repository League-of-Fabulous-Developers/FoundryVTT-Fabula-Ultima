import { ImprovisedEffect } from '../helpers/improvised-effect.mjs';
import { MathHelper } from '../helpers/math-helper.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { ResourcePipeline, ResourceRequest } from '../pipelines/resource-pipeline.mjs';
import { FU } from '../helpers/config.mjs';

/**
 * @typedef Roll
 * @property {Number} total
 */

/**
 * @description Contains contextual objects used for evaluating expressions
 * @property {FUActor} actor The actor the expression is evaluated on
 * @property {FUItem} item  The item the expression is evaluated on
 * @property {FUActor[]} targets The targets the expression is evaluated on
 * @property {FUActor} source Optionally, can be used to execute evaluations on
 * @property {InlineSourceInfo} sourceInfo
 * @remarks Do not serialize this class, as it references full objects. Instead, store their uuids
 * and resolve them with the static constructor
 */
export class ExpressionContext {
	constructor(actor, item, targets) {
		this.actor = actor;
		this.item = item;
		this.targets = targets;
		this.sourceInfo = InlineSourceInfo.fromInstance(this.actor, this.item);
	}

	/**
	 * @description Resolves the context based on the target type
	 * @param {FUActor|FUItem} target
	 * @param {FUActor|FUItem} parent
	 * @param {InlineSourceInfo} sourceInfo
	 */
	static resolveTarget(target, parent, sourceInfo) {
		let actor;
		let item;

		// 1. The effect is being applied onto an actor
		// 2. The effect is being applied onto an item
		if (target instanceof FUActor) {
			actor = target;
			if (parent instanceof FUItem) {
				item = parent;
			}
		} else if (target instanceof FUItem) {
			item = target;
			actor = item.actor;
		}

		const context = new ExpressionContext(actor, item, [target]);
		if (sourceInfo) {
			context.sourceUuid = sourceInfo.itemUuid;
		}
		return context;
	}

	/**
	 * @param {String} actorUuid
	 * @param {String} itemUuid
	 * @param {FUActor[]} targets
	 * @returns {ExpressionContext}
	 */
	static fromUuid(actorUuid, itemUuid, targets) {
		let actor = undefined;
		if (actorUuid !== undefined) {
			actor = fromUuidSync(actorUuid);
		}

		let item = undefined;
		if (itemUuid !== undefined) {
			item = fromUuidSync(itemUuid);
		}
		return new ExpressionContext(actor, item, targets);
	}

	/**
	 * @property {FUActor} actor The source of the action
	 * @property {FUItem} item
	 * @param {FUActor[]} targets
	 * @returns {ExpressionContext}
	 */
	static fromTargetData(actor, item, targets) {
		return new ExpressionContext(actor, item, Targeting.deserializeTargetData(targets));
	}

	/**
	 * @param {String} match
	 */
	assertActor(match) {
		if (this.actor == null) {
			ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
			throw new Error(`No reference to an actor provided while evaluating expression "${match}"`);
		}
	}

	/**
	 * @param {String} match
	 */
	assertSource(match) {
		if (this.source == null) {
			// Can be evaluated very early
			if (ui.notifications) {
				ui.notifications.warn('FU.ChatEvaluateAmountNoSource', { localize: true });
			}
			throw new Error(`No reference to a source provided while evaluating expression "${match}"`);
		}
	}

	/**
	 * @param {String} match
	 */
	assertSingleTarget(match) {
		if (this.targets.length !== 1) {
			ui.notifications.warn('FU.ChatApplyMaxTargetWarning', { localize: true });
			throw new Error(`Requires a single target for "${match}"`);
		}
	}

	/**
	 * @param {String} match
	 */
	assertItem(match) {
		if (this.item == null) {
			ui.notifications.warn('FU.ChatEvaluateAmountNoItem', { localize: true });
			throw new Error(`No reference to an item provided while evaluating expression "${match}"`);
		}
	}

	/**
	 * @description Resolves the actor or the target with the highest level
	 * @returns {FUActor}
	 */
	resolveActorOrHighestLevelTarget() {
		if (this.actor) {
			return this.actor;
		} else {
			if (this.targets.length > 0) {
				return this.targets.reduce((prev, current) => {
					return prev.system.level.value > current.system.level.value ? prev : current;
				});
			}
		}

		ui.notifications.warn('FU.ChatEvaluateAmountNoActor', { localize: true });
		throw new Error(`No reference to an actor or targets provided while evaluating expression"`);
	}

	/**
	 * @param {String} match
	 * @param {Boolean} redirect
	 * @returns {FUActor}
	 */
	resolveActorOrSource(match, redirect) {
		if (redirect) {
			this.assertSource(match);
			const sourceItem = this.source;
			const sourceActor = sourceItem.actor;
			if (!sourceActor) {
				ui.notifications.warn('FU.ChatEvaluateNoSourceActor', { localize: true });
				throw new Error(`The source item needs to be owned by an actor in order to evaluate the expression"`);
			}
			return sourceActor;
		}
		this.assertActor(match);
		return this.actor;
	}

	/**
	 * @returns {FUActor} The single target of the expression
	 */
	get target() {
		return this.targets[0];
	}

	/**
	 * @returns {FUItem}
	 */
	get source() {
		if (!this._source && this.sourceUuid) {
			this._source = fromUuidSync(this.sourceUuid);
		}
		return this._source;
	}
}

// DSL supported by the inline amount expression
const referenceSymbol = '@';
const itemLabel = `item`;
const redirectSymbol = '~';

/**
 * @param expression The raw text of the amount
 * @returns {boolean} True if the expression requires a context to be evaluated
 */
function requiresContext(expression) {
	return !Number.isInteger(Number(expression));
}

/**
 * @type {[Function<String>]}
 */
const evaluationFunctions = [evaluateVariables, evaluateEffects, evaluateReferencedFunctions, evaluateReferencedProperties, evaluateMacros];

/**
 * @description Evaluates the given expression using the supported DSL
 * @param {String} expression
 * @param {ExpressionContext} context
 * @example (@actor.level.value*2+minor+@item.level.value)
 * @example @actor.byLevel(40,50,60)
 * @example (minor + 5)
 * @return {Number} The evaluated amount
 */
function evaluate(expression, context) {
	if (!requiresContext(expression)) {
		return Number(expression);
	}

	// Evaluate the expression over each function
	let substitutedExpression = expression;
	for (const fn of evaluationFunctions) {
		substitutedExpression = fn(substitutedExpression, context);
	}

	// Now that the expression's variables have been substituted, evaluate it arithmetically
	const result = MathHelper.evaluate(substitutedExpression);

	if (Number.isNaN(result)) {
		throw new Error(`Failed to evaluate expression ${substitutedExpression}`);
	}

	console.debug(`Evaluated expression ${expression} = ${substitutedExpression} = ${result}`);
	return result;
}

/**
 * @type {[Promise<String>]}
 */
const asyncFunctions = [evaluateMacrosAsync];

/**
 * @description Evaluates the given expression using a superset of the DSL
 * @param {String} expression
 * @param {ExpressionContext} context
 * @return {Promise<Number>} The evaluated amount
 */
async function evaluateAsync(expression, context) {
	if (!requiresContext(expression)) {
		return Number(expression);
	}

	let substitutedExpression = expression;
	// Evaluate the expression over each synchronous function
	for (const fn of evaluationFunctions) {
		substitutedExpression = fn(substitutedExpression, context);
	}
	// Evaluate the expression over each asynchronous function
	for (const fn of asyncFunctions) {
		substitutedExpression = await fn(substitutedExpression, context);
	}

	// Now that the expression's variables have been substituted, evaluate it arithmetically
	const result = MathHelper.evaluate(substitutedExpression);

	if (Number.isNaN(result)) {
		throw new Error(`Failed to evaluate expression ${substitutedExpression}`);
	}

	console.debug(`Evaluated expression ${expression} = ${substitutedExpression} = ${result}`);
	return result;
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
 * @param {String} expression
 * @param {ExpressionContext} context
 * @returns {String}
 * @example $sl*10 Skill Level
 * @example $cl/2 Character Level
 * @example $dex Dexterity Roll
 * */
function evaluateVariables(expression, context) {
	const pattern = /\$(?<symbol>\w+)/gm;
	function evaluate(match, symbol) {
		switch (symbol) {
			// TODO: CHARACTER highest strength among bonds
			// TODO: CHARACTER number of bonds
			// Improvised effects
			case 'minor':
			case 'heavy':
			case 'massive':
				return ImprovisedEffect.calculateAmountFromContext(symbol, context);
			// Character level
			case 'cl':
				context.assertActor(match);
				return context.actor.system.level.value;
			// Item level / skill level
			case 'il':
			case 'sl':
				context.assertItem(match);
				return context.item.system.level.value;
			// Attributes
			case 'mig':
			case 'dex':
			case 'wlp':
			case 'ins': {
				context.assertActor(match);
				return getAttributeSize(context.actor, symbol);
			}
			// Target status count
			case 'tsc': {
				context.assertActor(match);
				context.assertSingleTarget(match);
				return countStatusEffects(context.target);
			}
			default:
				throw new Error(`Unsupported symbol ${symbol}`);
		}
	}
	return expression.replace(pattern, evaluate);
}

/**
 * @param {String} arg
 * @returns {String}
 */
function parseIdentifier(arg) {
	return arg.match(/(\w+-*\s*)+/gm)[0];
}

/**
 * @description Custom functions provided by the expression engine
 * @param {String} expression
 * @param {ExpressionContext} context
 * @returns {String}
 * @example &step(40,50,60)
 */
function evaluateMacros(expression, context) {
	const pattern = /~?&(?<name>[a-zA-Z]+)\((?<params>.*?)\)/gm;
	function evaluateMacro(match, name, params) {
		const redirect = match.startsWith(redirectSymbol);
		const splitArgs = params.split(',').map((i) => i.trim());
		switch (name) {
			// Skill level
			case `sl`: {
				const actor = context.resolveActorOrSource(match, redirect);
				const skillId = parseIdentifier(splitArgs[0]);
				const skill = actor.getSingleItemByFuid(skillId, 'skill');
				if (!skill) {
					ui.notifications.warn('FU.ChatEvaluateNoSkill', { localize: true });
					throw new Error(`The actor ${actor.name} does not have a skill with the Fabula Ultima Id ${skillId}`);
				}
				return skill.system.level.value;
			}
			// Clock section
			case 'cs': {
				context.assertActor();
				const id = parseIdentifier(splitArgs[0]);
				const clock = context.actor.getSingleItemByFuid(id).getProgress();
				return clock.current;
			}
			// Scale from 5-19, 20-39, 40+
			case 'step':
				return stepByLevel(context, splitArgs[0], splitArgs[1], splitArgs[2]);
			default:
				throw new Error(`Unsupported macro ${name}`);
		}
	}
	//return replaceAsync(expression, pattern, evaluateMacro);
	return expression.replace(pattern, evaluateMacro);
}

/**
 * @description Custom async functions provided by the expression engine
 * @param {String} expression
 * @param {ExpressionContext} context
 * @returns {Promise<String>}
 * @example &step(40,50,60)
 */
async function evaluateMacrosAsync(expression, context) {
	const pattern = /\^(?<name>[a-zA-Z]+)\((?<params>.*?)\)/gm;
	async function evaluateMacro(match, name, params) {
		const splitArgs = params.split(',').map((i) => i.trim());
		switch (name) {
			// Attribute roll
			case 'aroll': {
				context.assertActor(match);
				const attr = splitArgs[0];
				const roll = await rollAttributeDie(context.actor, attr);
				return roll.total;
			}
			// Backlash: Roll attribute, spend resource
			case 'backlash': {
				context.assertActor(match);
				const attr = splitArgs[0];
				const res = splitArgs[1];
				return await backlash(context.actor, attr, res, context.sourceInfo);
			}
		}
	}
	return replaceAsync(expression, pattern, evaluateMacro);
}

/**
 * @param {FUActor} actor
 * @return {Number}
 */
function countStatusEffects(actor) {
	const relevantStatusEffects = Object.keys(FU.temporaryEffects);
	return relevantStatusEffects.filter((status) => actor.statuses.has(status)).length;
}

// Used for referencing
const sourceLabel = 'source';
const actorLabel = `actor`;
const targetLabel = 'target';

function resolveActorFromLabel(match, label, context) {
	let actor;
	switch (label) {
		case actorLabel:
		case sourceLabel:
			context.assertActor(match);
			actor = context.actor;
			break;

		case targetLabel:
			context.assertSingleTarget(match);
			actor = context.targets[0];
			break;
	}
	return actor;
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
		const actor = resolveActorFromLabel(match, label, context);
		if (actor) {
			let splitArgs = args.split(',');
			const functionPath = `system.${path}`;
			const resolvedFunction = getFunctionFromPath(actor, functionPath);
			if (resolvedFunction === undefined) {
				throw new Error(`No function in path "${functionPath}" of object ${actor}`);
			}
			const result = resolvedFunction.apply(actor.system, splitArgs);
			console.info(`Resolved function ${functionPath}: ${result}`);
			return result;
		}
	}

	return expression.replace(pattern, evaluate);
}

/**
 * Evaluates properties within the expression using the available context
 * @param {String}  expression
 * @param {ExpressionContext} context
 * @returns {Promise<String>}
 * @example @system.value.thingie
 */
function evaluateReferencedProperties(expression, context) {
	const pattern = /@(?<label>[a-zA-Z]+)\.(?<path>(\w+\.?)*)/gm;
	function evaluate(match, label, path, pN, offset, string, groups) {
		// TODO: Refactor
		let root = null;
		let propertyPath = `system.${path}`;
		const actorName = context.actor?.name ?? 'unknown';

		switch (label) {
			// Check referenceActor
			case 'refActor': {
				const ref = context.actor?.system?.references?.actor;
				root = game.actors.get(ref?.id ?? ref);
				if (!root) {
					console.warn(`Missing or invalid refActor on ${actorName}`);
					return 0;
				}
				break;
			}
			// Check referenceSkill
			case 'refSkill': {
				const uuid = context.actor?.system?.references?.skill;
				root = uuid && fromUuidSync(uuid);
				if (!root) {
					console.warn(`Missing or invalid refSkill on ${actorName}`);
					return 0;
				}
				break;
			}
			// Check item
			case 'item': {
				context.assertItem(match);
				root = context.item;
				propertyPath = match.replace(`${referenceSymbol}${itemLabel}.`, 'system');
				break;
			}
			// Check actors
			default: {
				const actor = resolveActorFromLabel(match, label, context);
				if (actor) {
					root = actor;
					propertyPath = match.replace(`${referenceSymbol}${label}`, 'system');
				}
			}
		}

		// Evaluate the property value
		const propertyValue = getPropertyValueByPath(root, propertyPath);
		if (propertyValue === undefined) {
			throw new Error(`Unexpected variable "${propertyPath}" in object ${root}`);
		}
		if (propertyValue instanceof Object) {
			throw new Error(`Unexpected object returned from "${propertyPath}". It needs to be an integer!`);
		}
		console.info(`Resolved property @${label}.${path}: ${propertyValue}`);
		return propertyValue;
	}

	return expression.replace(pattern, evaluate);
}

/**
 * @param {FUActor} actor
 * @param {FU.attributes} key
 * @param {FU.resources} resource
 * @param {InlineSourceInfo} sourceInfo
 * @returns {Number}
 */
async function backlash(actor, key, resource, sourceInfo) {
	if (!(resource in FU.resources)) {
		throw Error(`${resource} is not a valid resource type`);
	}
	const roll = await rollAttributeDie(actor, key);
	const value = roll.total;
	const request = new ResourceRequest(sourceInfo, [actor], resource, value);
	await ResourcePipeline.processLoss(request);
	return value;
}

/**
 * @description Given 3 amounts, picks the one for this characters' level
 * @param {ExpressionContext} context
 * @param {Number} first
 * @param {Number} second
 * @param {Number} third
 */
function stepByLevel(context, first, second, third) {
	const actor = context.resolveActorOrHighestLevelTarget();
	const tier = ImprovisedEffect.getCharacterTier(actor.system.level.value);
	switch (tier) {
		case 0:
			return first;
		case 1:
			return second;
		case 2:
			return third;
	}
	return null;
}

/**
 * @param {String} str
 * @param {RegExp} regExp
 * @param {Promise<string, string, string>} replacerFunction
 * @returns {Promise<*>}
 */
async function replaceAsync(str, regExp, replacerFunction) {
	const matches = str.matchAll(regExp);
	let replacements = [];
	for (const match of matches) {
		replacements.push(await replacerFunction(...match));
	}
	let i = 0;
	return str.replace(regExp, () => replacements[i++]);
}

/**
 * @param {FUActor} actor
 * @param {FU.attributes} key
 * @returns {Promise<Roll>} Retrieve from total
 */
async function rollAttributeDie(actor, key) {
	const dice = getAttributeSize(actor, key);
	const formula = `d${dice}`;
	const roll = await new Roll(formula).roll();
	if (game.dice3d) {
		await game.dice3d.showForRoll(roll);
	}
	return roll;
}

/**
 * @param {FUActor} actor
 * @param {FU.attributes} key
 * @returns {Number}
 */
function getAttributeSize(actor, key) {
	const attributes = actor.system.attributes;
	return attributes[key].current;
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
	evaluateAsync,
	requiresContext,
	getFunctionFromPath,
	getPropertyValueByPath,
};
