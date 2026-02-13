import { Pipeline, PipelineRequest } from './pipeline.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { InlineHelper, InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { TokenUtils } from '../helpers/token-utils.mjs';
import { Targeting } from '../helpers/targeting.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';
import { CheckHooks } from '../checks/check-hooks.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';

/**
 * @class
 * @property {String} type
 * @property {ScalarModifier[]} modifiers
 */
export class UpdateResourceData {
	static get baseModifier() {
		return 'FU.Base';
	}

	constructor(data = {}) {
		Object.assign(this, data);
		if (!this.modifiers) {
			this.modifiers = [];
		}
	}

	/**
	 * @param {FUResourceType} type
	 * @param {number} amount
	 * @returns {DamageData}
	 */
	static construct(type, amount) {
		const data = new UpdateResourceData();
		data.addModifier(this.baseModifier, amount);
		data.type = type;
		return data;
	}

	/**
	 * @param {String} label
	 * @param {Number} amount
	 */
	addModifier(label, amount) {
		/** @type DamageModifier **/
		const modifier = {
			label: label ?? UpdateResourceData.baseModifier,
			amount: amount,
			enabled: true,
		};
		this.modifiers.push(modifier);
	}

	/**
	 * @returns {number}
	 */
	get total() {
		let result = 0;
		for (const mod of this.modifiers) {
			if (mod.enabled) {
				result += mod.amount;
			}
		}
		return result;
	}
}

/**
 * @property {Number} amount
 * @property {String} resourceType
 * @property {Boolean} uncapped
 * @property {Boolean} gain
 * @extends PipelineRequest
 * @inheritDoc
 */
export class ResourceRequest extends PipelineRequest {
	/**
	 * @param {InlineSourceInfo} sourceInfo
	 * @param {FUActor[]} targets
	 * @param {FUResourceType} resourceType
	 * @param {Number} amount
	 * @param {Boolean} uncapped
	 */
	constructor(sourceInfo, targets, resourceType, amount, uncapped = false) {
		super(sourceInfo, targets);
		this.resourceType = resourceType;
		this.gain = amount >= 0;
		this.amount = amount;
		this.uncapped = uncapped;
	}

	/**
	 * @returns {boolean} True if the resource is FP, EXP or ZENIT
	 */
	get isMetaCurrency() {
		return this.resourceType === 'fp' || this.resourceType === 'exp' || this.resourceType === 'zenit';
	}

	/**
	 * @returns {string} The key to the resource within the actor's data model
	 */
	get attributeKey() {
		return `resources.${this.resourceType}`;
	}

	/**
	 * @returns {string} The full path to the accessor for resource in an actor's data model
	 */
	get attributeValuePath() {
		return `resources.${this.resourceType}.value`;
	}

	/**
	 * @returns {string} The full path to the accessor for resource in an actor's data model
	 */
	get attributePath() {
		return `resources.${this.resourceType}`;
	}

	get resourceLabel() {
		return game.i18n.localize(FU.resources[this.resourceType]);
	}
}

const recoveryFlavor = {
	hp: 'FU.HealthPointRecovery',
	mp: 'FU.MindPointRecovery',
	ip: 'FU.InventoryPointRecovery',
	fp: 'FU.TextEditorButtonCommandGain',
	exp: 'FU.TextEditorButtonCommandGain',
	zenit: 'FU.TextEditorButtonCommandGain',
};

const recoveryMessages = {
	hp: 'FU.HealthPointRecoveryMessage',
	mp: 'FU.MindPointRecoveryMessage',
	ip: 'FU.InventoryPointRecoveryMessage',
	fp: 'FU.ChatResourceGain',
	exp: 'FU.ChatResourceGain',
	zenit: 'FU.ChatResourceGain',
};

/**
 * @param {FUActor} actor
 * @param {String} resourcePath
 * @returns {number|number}
 */
function getResourceValue(actor, resourcePath) {
	return parseInt(foundry.utils.getProperty(actor.system, resourcePath), 10) || 0;
}

/**
 * @param {FUActor} actor
 * @param {String} attributePath
 * @param {Number} amountRecovered
 * @returns {Promise<*>
 */
function createUpdateForRecovery(actor, attributePath, amountRecovered) {
	const currentValue = getResourceValue(actor, attributePath);
	const newValue = Math.floor(currentValue + amountRecovered);

	// Update the actor's resource directly
	const updateData = {
		[`system.${attributePath}`]: newValue,
	};
	return actor.update(updateData);
}

function calculateMissingResource(actor, resourcePath) {
	const resource = foundry.utils.getProperty(actor.system, resourcePath);
	return resource.max - resource.value;
}

/**
 * @param {ResourceRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function processRecovery(request) {
	const flavor = game.i18n.localize(recoveryFlavor[request.resourceType]);
	const outgoingRecoveryBonus = request.sourceActor?.system.bonuses.outgoingRecovery[request.resourceType] || 0;
	const outgoingRecoveryMultiplier = request.sourceActor?.system.multipliers.outgoingRecovery[request.resourceType] || 1;

	const updates = [];
	console.debug(`Applying recovery from request with traits: ${[...request.traits].join(', ')}`);
	for (const actor of request.targets) {
		if (!actor.isOwner) {
			ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
			continue;
		}
		const incomingRecoveryBonus = actor.system.bonuses.incomingRecovery[request.resourceType] || 0;
		const incomingRecoveryMultiplier = actor.system.multipliers.incomingRecovery[request.resourceType] ?? 1;
		let amountRecovered = Math.max(0, Math.floor((request.amount + incomingRecoveryBonus + outgoingRecoveryBonus) * (incomingRecoveryMultiplier * outgoingRecoveryMultiplier)));
		const attr = foundry.utils.getProperty(actor.system, request.attributeKey);
		const uncappedRecoveryValue = amountRecovered + attr.value;
		const updates = [];

		if (request.isMetaCurrency) {
			updates.push(createUpdateForRecovery(actor, request.attributeValuePath, amountRecovered));
		} else {
			// Overheal recovery (uncapped)
			if (request.uncapped === true && uncappedRecoveryValue > (attr.max || 0)) {
				// Clone attribute
				const newValue = Object.defineProperties({}, Object.getOwnPropertyDescriptors(attr));
				newValue.value = uncappedRecoveryValue;
				updates.push(
					actor.modifyTokenAttribute(request.attributeKey, newValue, false, false).then((result) => {
						CommonEvents.gain(actor, request.resourceType, amountRecovered, request.origin);
						return result;
					}),
				);
			}
			// Normal recovery
			else {
				// Lower amount recovered by how much the target is missing
				amountRecovered = Math.min(amountRecovered, calculateMissingResource(actor, request.attributePath));
				if (amountRecovered === 0) {
					const message = incomingRecoveryMultiplier > 0 ? 'FU.ChatRecoveryNotNeeded' : 'FU.ChatRecoveryNotPossible';
					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor }),
						flags: Pipeline.initializedFlags(Flags.ChatMessage.ResourceGain, true),
						content: game.i18n.format(message, {
							actor: actor.name,
							resource: request.resourceType.toUpperCase(),
						}),
					});
					continue;
				}
				updates.push(
					actor.modifyTokenAttribute(request.attributeKey, amountRecovered, true).then((result) => {
						CommonEvents.gain(actor, request.resourceType, amountRecovered, request.origin);
						return result;
					}),
				);
			}
		}
		TokenUtils.showFloatyText(actor, `${amountRecovered} ${request.resourceType.toUpperCase()}`, `lightgreen`);
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: flavor,
				flags: Pipeline.initializedFlags(Flags.ChatMessage.ResourceGain, true),
				content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-apply-recovery.hbs', {
					message: recoveryMessages[request.resourceType],
					actor: actor.name,
					uuid: actor.uuid,
					amount: amountRecovered,
					key: request.attributeKey,
					resource: request.resourceType,
					resourceLabel: request.resourceLabel,
					from: request.sourceInfo.name,
				}),
			}),
		);
	}
	updates.push(CommonEvents.resource(request.sourceActor, request.targets, request.resourceType, request.amount, request.origin));
	return Promise.all(updates);
}

const lossFlavor = {
	hp: 'FU.HealthPointLoss',
	mp: 'FU.MindPointLoss',
	ip: 'FU.InventoryPointLoss',
	fp: 'FU.TextEditorButtonCommandLoss',
	exp: 'FU.TextEditorButtonCommandLoss',
	zenit: 'FU.TextEditorButtonCommandLoss',
};

/**
 * @param {ResourceRequest} request
 * @return {Promise<Awaited<unknown>[]>}
 */
async function processLoss(request) {
	const flavor = game.i18n.localize(lossFlavor[request.resourceType]);

	const updates = [];
	console.debug(`Applying loss from request with traits: ${[...request.traits].join(', ')}`);
	const amount = Math.abs(request.amount);
	for (const actor of request.targets) {
		if (!actor.isOwner) {
			ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
			continue;
		}
		const incomingLossMultiplier = actor.system.multipliers.incomingLoss[request.resourceType] || 1;
		const incomingLossBonus = actor.system.bonuses.incomingLoss[request.resourceType] || 0;
		const amountLost = -Math.max(0, Math.floor((amount + incomingLossBonus) * incomingLossMultiplier));

		if (request.isMetaCurrency) {
			const currentValue = foundry.utils.getProperty(actor.system, request.attributeValuePath) || 0;
			const newValue = currentValue + amountLost;
			const updateData = {};
			updateData[`system.${request.attributeValuePath}`] = newValue;
			updates.push(
				actor.update(updateData).then((result) => {
					CommonEvents.loss(actor, request.resourceType, amountLost, request.origin);
					return result;
				}),
			);
		} else {
			updates.push(
				actor.modifyTokenAttribute(request.attributeKey, amountLost, true).then((result) => {
					CommonEvents.loss(actor, request.resourceType, amountLost, request.origin);
					return result;
				}),
			);
		}

		TokenUtils.showFloatyText(actor, `${amountLost} ${request.resourceType.toUpperCase()}`, `lightyellow`);
		updates.push(
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				flavor: flavor,
				flags: Pipeline.initializedFlags(Flags.ChatMessage.ResourceLoss, true),
				content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-apply-loss.hbs', {
					message: 'FU.ChatResourceLoss',
					actor: actor.name,
					amount: Math.abs(amountLost),
					uuid: actor.uuid,
					key: request.attributeKey,
					resource: request.resourceType,
					resourceLabel: request.resourceLabel,
					from: request.sourceInfo.name,
				}),
			}),
		);
	}
	updates.push(CommonEvents.resource(request.sourceActor, request.targets, request.resourceType, amount, request.origin));
	return Promise.all(updates);
}

async function process(request) {
	if (request.amount >= 0) {
		return processRecovery(request);
	} else {
		return processLoss(request);
	}
}

/**
 * @param {ActionCostDataModel} cost
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {TargetData[]} targets
 * @return {Promise<ResourceExpense>}
 */
async function calculateExpense(cost, actor, item, targets) {
	const itemGroup = InlineHelper.resolveItemGroup(item);
	if (!cost.amount) {
		return {
			resource: cost.resource,
			amount: 0,
			source: itemGroup,
		};
	}

	const context = ExpressionContext.fromTargetData(actor, item, targets);
	const amount = await Expressions.evaluateAsync(cost.amount, context);
	return {
		resource: cost.resource,
		amount: amount * (cost.perTarget ? Math.max(1, targets.length) : 1),
		source: itemGroup,
	};
}

/**
 * @param {Document} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	if (!message.getFlag(SYSTEM, Flags.ChatMessage.ResourceLoss) && !message.getFlag(SYSTEM, Flags.ChatMessage.ResourceGain)) {
		return;
	}

	/**
	 * @param {Object} dataset
	 * @returns {Promise<Awaited<*>[]>}
	 */
	const applyResourceLoss = async (dataset) => {
		const sourceInfo = new InlineSourceInfo(dataset.name, dataset.actor, dataset.item);
		const actor = sourceInfo.resolveActor();
		const request = new ResourceRequest(sourceInfo, [actor], dataset.resource, dataset.amount);
		return ResourcePipeline.processLoss(request);
	};

	Pipeline.handleClick(message, html, 'applyResourceLoss', applyResourceLoss);

	Pipeline.handleClickRevert(message, html, 'revertResourceLoss', async (dataset) => {
		const actor = fromUuidSync(dataset.uuid);
		const amount = dataset.amount;
		const attributeKey = dataset.key;
		const updates = [];
		updates.push(actor.modifyTokenAttribute(attributeKey, amount, true));
		TokenUtils.showFloatyText(actor, `${amount} ${dataset.resource.toUpperCase()}`, `lightgreen`);
		return Promise.all(updates);
	});

	Pipeline.handleClickRevert(message, html, 'revertResourceGain', async (dataset) => {
		const actor = fromUuidSync(dataset.uuid);
		const amount = dataset.amount;
		const attributeKey = dataset.key;
		const updates = [];
		updates.push(actor.modifyTokenAttribute(attributeKey, -amount, true));
		TokenUtils.showFloatyText(actor, `${amount} ${dataset.resource.toUpperCase()}`, `red`);
		return Promise.all(updates);
	});

	Pipeline.handleClick(message, html, 'updateResource', async (dataset) => {
		/** @type {FUActor} **/
		const fields = StringUtils.fromBase64(dataset.fields);
		const sourceInfo = InlineSourceInfo.fromObject(fields.sourceInfo);
		const amount = fields.amount;
		const type = fields.type;
		const targets = await Pipeline.getTargetsFromAction(dataset);
		const request = new ResourceRequest(sourceInfo, targets, type, amount, {});
		return process(request);
	});
}

/**
 * @param {ResourceRequest} request
 * @returns {Promise<void>}
 */
async function prompt(request) {
	const targets = Targeting.serializeTargetData(request.targets);
	const gain = request.amount > 0;
	const actions = [getTargetedAction(request)];
	const message = gain > 0 ? 'FU.ChatResourceGainPrompt' : 'FU.ChatResourceLossPrompt';
	let flags = Pipeline.initializedFlags(Flags.ChatMessage.ResourceGain, true);
	flags = Pipeline.setFlag(flags, Flags.ChatMessage.CheckV2, true);
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ user: game.users.activeGM }),
		flags: flags,
		content: await FoundryUtils.renderTemplate('chat/chat-update-resource-prompt', {
			message: message,
			amount: request.amount,
			type: StringUtils.localize(FU.resources[request.resourceType]),
			source: request.sourceInfo.name,
			targets: targets,
			actions: actions,
		}),
	});
}

function getTargetedAction(request) {
	const resourceIcon = FU.resourceIcons[request.resourceType];
	const tooltip = StringUtils.localize(request.gain ? 'FU.ChatResourceGainTooltip' : 'FU.ChatResourceLossTooltip', {
		amount: request.amount,
		resource: StringUtils.localize(FU.resources[request.resourceType]),
	});

	return new ChatAction('updateResource', resourceIcon, tooltip, {
		amount: request.amount,
		type: request.resourceType,
		sourceInfo: request.sourceInfo,
	})
		.requiresOwner()
		.setFlag(request.gain ? Flags.ChatMessage.ResourceGain : Flags.ChatMessage.ResourceLoss)
		.withLabel(tooltip)
		.withColor(request.gain ? 'var(--color-hp)' : 'var(--color-hp-crisis)')
		.withTraits(request.traits)
		.withSelected();
}

const onProcessCheck = (check, actor, item, registerCallback) => {
	registerCallback(async (check, actor, item) => {
		const config = CheckConfiguration.configure(check);
		if (config.hasResource) {
			const data = config.getResource();
			await CommonEvents.calculateResource(actor, item, config, data);
		}
	});
};

/**
 * @param config
 * @param actor
 * @param item
 * @param {ActionCostDataModel} cost
 * @returns {Promise<void>}
 */
async function configureExpense(config, actor, item, cost) {
	const targets = config.getTargets();
	const expense = await ResourcePipeline.calculateExpense(cost, actor, item, targets);
	await CommonEvents.calculateExpense(actor, item, targets, expense);
	config.setExpense(expense.resource, expense.amount);
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
	Hooks.on(CheckHooks.processCheck, onProcessCheck);
}

export const ResourcePipeline = {
	initialize,
	processRecovery,
	processLoss,
	process,
	calculateExpense,
	calculateMissingResource,
	prompt,
	getTargetedAction,
	configureExpense,
};
