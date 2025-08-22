import { Pipeline, PipelineRequest } from './pipeline.mjs';
import { FU, SYSTEM } from '../helpers/config.mjs';
import { InlineSourceInfo } from '../helpers/inline-helper.mjs';
import { Flags } from '../helpers/flags.mjs';
import { CommonEvents } from '../checks/common-events.mjs';
import { TokenUtils } from '../helpers/token-utils.mjs';

/**
 * @property {Number} amount
 * @property {String} resourceType
 * @property {Boolean} uncapped
 * @extends PipelineRequest
 * @inheritDoc
 */
export class ResourceRequest extends PipelineRequest {
	constructor(sourceInfo, targets, resourceType, amount, uncapped = false) {
		super(sourceInfo, targets);
		this.resourceType = resourceType;
		this.amount = Math.abs(amount);
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
		const incomingRecoveryBonus = actor.system.bonuses.incomingRecovery[request.resourceType] || 0;
		const incomingRecoveryMultiplier = actor.system.multipliers.incomingRecovery[request.resourceType] || 1;
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
				updates.push(actor.modifyTokenAttribute(request.attributeKey, newValue, false, false));
			}
			// Normal recovery
			else {
				// Lower amount recovered by how much the target is missing
				amountRecovered = Math.min(amountRecovered, calculateMissingResource(actor, request.attributePath));
				// No recovery possible
				if (amountRecovered === 0) {
					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor }),
						flags: Pipeline.initializedFlags(Flags.ChatMessage.ResourceGain, true),
						content: game.i18n.format('FU.ChatRecoveryNotNeeded', {
							actor: actor.name,
							resource: request.resourceType.toUpperCase(),
						}),
					});
					continue;
				}
				updates.push(actor.modifyTokenAttribute(request.attributeKey, amountRecovered, true));
			}
		}

		CommonEvents.gain(actor, request.resourceType, amountRecovered);

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
	for (const actor of request.targets) {
		const incomingLossMultiplier = actor.system.multipliers.incomingLoss[request.resourceType] || 1;
		const incomingLossBonus = actor.system.bonuses.incomingLoss[request.resourceType] || 0;
		const amountLost = -Math.max(0, Math.floor((request.amount + incomingLossBonus) * incomingLossMultiplier));

		if (request.isMetaCurrency) {
			const currentValue = foundry.utils.getProperty(actor.system, request.attributeValuePath) || 0;
			const newValue = currentValue + amountLost;
			// Update the actor's resource directly
			const updateData = {};
			updateData[`system.${request.attributeValuePath}`] = newValue;
			updates.push(actor.update(updateData));
		} else {
			updates.push(actor.modifyTokenAttribute(request.attributeKey, amountLost, true));
		}

		// Dispatch event
		CommonEvents.loss(actor, request.resourceType, amountLost);

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
	return Promise.all(updates);
}

/**
 * @typedef ResourceExpense
 * @property {String} resource
 * @property {Number} amount
 */

/**
 * @param {ActionCostDataModel} cost
 * @param {TargetData[]} targets
 * @return {ResourceExpense}
 */
function calculateExpense(cost, targets) {
	return {
		resource: cost.resource,
		amount: cost.amount * (cost.perTarget ? Math.max(1, targets.length) : 1),
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
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
}

export const ResourcePipeline = {
	initialize,
	processRecovery,
	processLoss,
	calculateExpense,
	calculateMissingResource,
};
