/**
 * @returns {ChatAction}
 */
import { StringUtils } from '../helpers/string-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { systemId } from '../helpers/system-utils.mjs';
import { Pipeline } from './pipeline.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { ClassFeatureRegistry } from '../documents/items/classFeature/class-feature-registry.mjs';

/**
 * @desc An application used for specific class features.
 * @typedef FeatureApplication
 * @property {String} label
 * @property {Promise<FUActor, FUItem>} open
 */

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @returns {Promise<void>}
 */
async function handleTheriomorphosis(actor, item) {
	// TODO: Implement...
	const items = actor.itemTypes;
	const subtype = ClassFeatureRegistry.instance.qualify('therioform');
	/** @type {FUItem[]} **/
	const classFeatures = items.classFeature.filter((it) => it.system.featureType === subtype);
	const formEffects = classFeatures.flatMap((it) => [...it.effects.values()]);
	console.debug(`Forms: ${formEffects}`);
}

/**
 * @type {Record<string, FeatureApplication>}
 */
const applications = Object.freeze({
	theriomorphosis: {
		label: 'FU.Transform',
		open: handleTheriomorphosis,
	},
});

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {String} name The application name.
 * @returns {ChatAction}
 */
function getChatAction(actor, item, name) {
	/** @type FeatureApplication **/
	const application = applications[name];
	if (!application) {
		return null;
	}

	const icon = 'fa fa-window-restore';
	const tooltip = StringUtils.localize(application.label);
	return new ChatAction('openApplication', icon, tooltip, {
		name: name,
		actor: actor.uuid,
		item: item.uuid,
	})
		.setFlag(Flags.ChatMessage.Application)
		.notTargeted()
		.withLabel(tooltip)
		.withSelected()
		.requiresOwner();
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	if (!message.getFlag(systemId, Flags.ChatMessage.Application)) {
		return;
	}

	Pipeline.handleClick(message, html, 'openApplication', async (dataset) => {
		/** @type {FUActor} **/
		const fields = StringUtils.fromBase64(dataset.fields);
		const name = fields.name;
		const actorId = fields.actor;
		const itemId = fields.item;

		const actor = await fromUuid(actorId);
		if (!actor) {
			return;
		}

		// Only valid for those who own this actor
		if (!actor.isOwner) {
			ui.notifications.warn('FU.ChatActorOwnershipWarning', { localize: true });
			return;
		}

		const item = await fromUuid(itemId);
		if (!item) {
			return;
		}
		/** @type FeatureApplication **/
		const application = applications[name];
		return application.open(actor, item);
	});
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
}

export const ApplicationPipeline = {
	initialize,
	getChatAction,
};
