/**
 * @returns {ChatAction}
 */
import { StringUtils } from '../helpers/string-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { systemId } from '../helpers/system-utils.mjs';
import { Pipeline } from './pipeline.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { ClassFeatureRegistry } from '../documents/items/classFeature/class-feature-registry.mjs';
import { ItemSelectionDialog } from '../ui/features/item-selection-dialog.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';

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
async function handleArcanum(actor, item) {
	// TODO: Implement...
	const items = actor.itemTypes;
	const subtype = ClassFeatureRegistry.instance.qualify('arcanum');
	/** @type {FUItem[]} **/
	const classFeatures = items.classFeature.filter((it) => it.system.featureType === subtype);
	/** @type {FUActiveEffect[]} **/
	const classEffects = classFeatures.flatMap((it) => [...it.effects.values()]);
	const activeArcanum = classEffects.find((it) => !it.disabled);
	const title = StringUtils.localize('FU.ClassFeatureArcanum');

	// Dismiss
	if (activeArcanum) {
		/** @type ArcanumDataModel **/
		const arcanumData = activeArcanum.system;
		console.debug(arcanumData);
	}
	// Summon
	else {
		/** @type ItemSelectionData **/
		const data = {
			title,
			message: StringUtils.localize('FU.ClassFeatureArcanumHint'),
			max: 1,
			items: classFeatures,
			okLabel: StringUtils.localize('FU.Summon'),
		};

		const dialog = new ItemSelectionDialog(data);
		const result = await dialog.open();
		if (result) {
			const selectedArcana = result[0];
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor: actor }),
				content: await FoundryUtils.renderTemplate('feature/arcanist/chat-arcanum-summon', {
					item: selectedArcana,
					message: 'FU.ClassFeatureArcanumSummon',
					details: selectedArcana.system.data.merge,
				}),
			});
		}
	}
}

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
	const title = StringUtils.localize('FU.ClassFeatureTherioformLabel');
	/** @type ItemSelectionData **/
	const data = {
		title,
		message: StringUtils.localize('FU.ClassFeatureTherioformHint'),
		max: 2, // TODO: Check for heroic skill
		items: formEffects,
	};
	for (const effect of formEffects) {
		await effect.update({ disabled: true });
	}
	const dialog = new ItemSelectionDialog(data);
	const selectedForms = await dialog.open();
	if (selectedForms) {
		for (const effect of selectedForms) {
			await effect.update({ disabled: !effect.disabled });
		}
		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			content: await FoundryUtils.renderTemplate('feature/mutant/chat-therioform-manifest', {
				actor: actor,
				forms: selectedForms,
			}),
		});
	}
}

/**
 * @type {Record<string, FeatureApplication>}
 */
const applications = Object.freeze({
	theriomorphosis: {
		label: 'FU.Transform',
		open: handleTheriomorphosis,
	},
	arcanist: {
		label: 'FU.Perform',
		open: handleArcanum,
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
