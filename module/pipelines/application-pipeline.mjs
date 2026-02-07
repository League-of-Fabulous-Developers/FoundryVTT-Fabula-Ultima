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
import { CommonEvents } from '../checks/common-events.mjs';
import { FeatureTraits } from './traits.mjs';
import { CommonSections } from '../checks/common-sections.mjs';
import { SectionChatBuilder } from '../helpers/section-chat-builder.mjs';
import { CHECK_DETAILS } from '../checks/default-section-order.mjs';

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
	const title = StringUtils.localize('FU.ClassFeatureArcanum');

	const currentArcanumId = actor.system.equipped.arcanum;
	const currentArcanum = actor.items.get(currentArcanumId);

	// Dismiss
	if (currentArcanum) {
		/** @type ArcanumDataModel **/
		const currentArcanumData = currentArcanum.system.data;
		const choice = await FoundryUtils.promptItemChoice({
			title: `${title}: ${StringUtils.localize('FU.ClassFeatureArcanumDismiss')}`,
			actor: actor,
			item: currentArcanum,
			description: currentArcanumData.dismiss,
			buttons: [
				{
					action: 'dismiss',
					label: `FU.ClassFeatureArcanumDismiss`,
					icon: 'fas fa-bolt',
					primary: true,
				},
			],
		});
		if (choice === 'dismiss') {
			await actor.update({
				'system.equipped.arcanum': null,
			});
			const builder = new SectionChatBuilder(actor, item);
			CommonSections.itemFlavor(builder.sections, currentArcanum);
			const content = await FoundryUtils.renderTemplate('feature/arcanist/feature-arcanum-chat-message-v2', {
				item: currentArcanum,
				message: 'FU.ClassFeatureArcanumDismissMessage',
				details: currentArcanumData.dismiss,
			});
			CommonSections.content(builder.sections, content, CHECK_DETAILS);
			await CommonEvents.feature(actor, item, [FeatureTraits.ArcanumDismiss], builder);
			await builder.create();
		}

		console.log(choice);
	}
	// Summon
	else {
		/** @type ItemSelectionData **/
		const data = {
			title: `${title}: ${StringUtils.localize('FU.ClassFeatureArcanumMerge')}`,
			max: 1,
			items: classFeatures,
			getDescription: async (item) => {
				const text = await FoundryUtils.enrichText(item.system.data.merge, {
					relativeTo: actor,
				});
				return text;
			},
			okLabel: 'FU.ClassFeatureArcanumMerge',
		};

		const dialog = new ItemSelectionDialog(data);
		const result = await dialog.open();
		if (result && result.length > 0) {
			/** @type FUItem **/
			const selectedArcana = result[0];
			const selectedArcanaEffect = selectedArcana.effects.size === 1 ? Array.from(selectedArcana.effects.values())[0] : null;
			if (selectedArcanaEffect) {
				const expense = {
					resource: 'mp',
					amount: 40,
					traits: [FeatureTraits.ArcanumSummon],
				};
				await CommonEvents.calculateExpense(actor, item, [], expense);
				console.debug(`Arcanum summon cost: ${expense.amount}`);
				await actor.update({
					'system.equipped.arcanum': selectedArcana.id,
				});
				const builder = new SectionChatBuilder(actor, item);
				CommonSections.itemFlavor(builder.sections, selectedArcana);
				const content = await FoundryUtils.renderTemplate('feature/arcanist/feature-arcanum-chat-message-v2', {
					item: selectedArcana,
					message: 'FU.ClassFeatureArcanumSummonMessage',
					details: selectedArcana.system.data.merge,
				});
				CommonSections.content(builder.sections, content, CHECK_DETAILS);
				await CommonEvents.feature(actor, item, expense.traits, builder);
				CommonSections.expense(builder.sections, actor, item, expense, builder.flags);
				await builder.create();
			}
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
	/** @type ItemSelectionData **/
	const data = {
		title: `${StringUtils.localize('FU.ClassFeatureTherioformLabel')}`,
		message: StringUtils.localize('FU.ClassFeatureTherioformHint'),
		max: 2, // TODO: Check for heroic skill
		items: formEffects,
		getDescription: async (item) => {
			const text = await FoundryUtils.enrichText(item.parent.system.description, {
				relativeTo: actor,
			});
			return text;
		},
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
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {String} name The application name.
 * @returns {() => Promise<void>}
 */
function getAction(actor, item, name) {
	/** @type FeatureApplication **/
	const application = applications[name];
	if (!application) {
		return null;
	}

	return async () => application.open(actor, item);
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
	getAction,
};
