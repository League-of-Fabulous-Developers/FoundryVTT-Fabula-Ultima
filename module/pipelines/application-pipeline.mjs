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
import { FUChatBuilder } from '../helpers/chat-builder.mjs';
import { CHECK_DETAILS } from '../checks/default-section-order.mjs';
import { getSystemSetting, SETTINGS } from '../settings.js';
import { ResourcePipeline } from '../pipelines/resource-pipeline.mjs';

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

	// If the item passed in has a cost, use it.
	/** @type ResourceExpense **/
	const arcanumCost = {
		resource: item.system.cost.resource ?? 'mp',
		amount: item.system.cost.amount ?? 40,
	};

	// Dismiss/Pulse
	if (currentArcanum) {
		/** @type ArcanumDataModel **/
		const currentArcanumData = currentArcanum.system.data;

		/** @type FUDialogContentSection[] **/
		let sections = [];
		let buttons = [];

		// FOR REFERENCE: Merge
		sections.push({
			title: `FU.ClassFeatureArcanumMerge`,
			text: await FoundryUtils.enrichText(currentArcanumData.merge, {
				relativeTo: actor,
			}),
		});

		// OPTIONAL: Pulse
		if (getSystemSetting(SETTINGS.optionArcanumPulse) && currentArcanumData.pulse) {
			sections.push({
				title: `FU.ClassFeatureArcanumPulse`,
				text: await FoundryUtils.enrichText(currentArcanumData.pulse, {
					relativeTo: actor,
				}),
			});
			buttons.push({
				action: 'pulse',
				label: `FU.ClassFeatureArcanumPulse`,
				icon: 'fas fa-burst',
				primary: false,
			});
		}

		// ALWAYS: DISMISS
		buttons.push({
			action: 'dismiss',
			label: `FU.ClassFeatureArcanumDismiss`,
			icon: 'fas fa-bolt',
			primary: true,
		});
		sections.push({
			title: `FU.ClassFeatureArcanumDismiss`,
			text: await FoundryUtils.enrichText(currentArcanumData.dismiss, {
				relativeTo: actor,
			}),
		});

		const dialogData = {
			title: `${title} - ${currentArcanum.name}`,
			actor: actor,
			buttons: buttons,
			item: currentArcanum,
			sections: sections,
		};

		const choice = await FoundryUtils.promptChoiceSections(dialogData);

		if (choice === 'dismiss') {
			await actor.update({
				'system.equipped.arcanum': null,
			});
			/** @type {FURenderData} **/
			const renderData = {
				sections: [],
				postRenderActions: [],
			};
			CommonSections.itemFlavor(renderData.sections, currentArcanum);
			const content = await FoundryUtils.renderTemplate('feature/arcanist/feature-arcanum-chat-message-v2', {
				item: currentArcanum,
				message: 'FU.ClassFeatureArcanumDismissMessage',
				details: currentArcanumData.dismiss,
			});
			CommonSections.content(renderData.sections, content, CHECK_DETAILS);
			await CommonEvents.feature(actor, item, [FeatureTraits.ArcanumDismiss], renderData);
			const builder = new FUChatBuilder(actor, item).withData(renderData);
			await builder.create();
		} else if (choice === 'pulse') {
			/** @type {FURenderData} **/
			const renderData = {
				sections: [],
				postRenderActions: [],
			};
			CommonSections.itemFlavor(renderData.sections, currentArcanum);
			const content = await FoundryUtils.renderTemplate('feature/arcanist/feature-arcanum-chat-message-v2', {
				item: currentArcanum,
				message: 'FU.ClassFeatureArcanumPulseMessage',
				details: currentArcanumData.pulse,
			});
			CommonSections.content(renderData.sections, content, CHECK_DETAILS);
			await CommonEvents.feature(actor, item, [FeatureTraits.ArcanumPulse], renderData);
			const builder = new FUChatBuilder(actor, item).withData(renderData);
			await builder.create();
		}

		console.log(choice);
	}
	// Summon
	else {
		/** @type ItemSelectionData **/
		const data = {
			title: `${title}: ${StringUtils.localize('FU.Summon')}`,
			max: 1,
			items: classFeatures,
			style: 'deck',
			getDescription: async (item) => {
				return await FoundryUtils.enrichText(item.system.data.merge, {
					relativeTo: actor,
				});
			},
			okLabel: 'FU.ClassFeatureArcanumMerge',
		};

		const dialog = new ItemSelectionDialog(data);
		const result = await dialog.open();
		if (result && result.length > 0) {
			/** @type FUItem **/
			const selectedArcana = result[0];
			//const selectedArcanaEffect = selectedArcana.effects.size === 1 ? Array.from(selectedArcana.effects.values())[0] : null;
			if (selectedArcana) {
				// Equip the arcana
				await actor.update({
					'system.equipped.arcanum': selectedArcana.id,
				});
				// Calculate summon cost
				/** @type ResourceExpense **/
				const arcanumCostWithTraits = {
					...arcanumCost,
					traits: [FeatureTraits.ArcanumSummon],
				};
				const expense = await ResourcePipeline.calculateExpense(arcanumCostWithTraits, actor, item, []);
				await CommonEvents.calculateExpense(actor, item, [], expense);
				console.debug(`Arcanum summon cost: ${expense.amount}`);
				// Render sections
				/** @type {FURenderData} **/
				const renderData = {
					sections: [],
					postRenderActions: [],
				};
				let flags = {};

				CommonSections.itemFlavor(renderData.sections, selectedArcana);
				const content = await FoundryUtils.renderTemplate('feature/arcanist/feature-arcanum-chat-message-v2', {
					item: selectedArcana,
					message: 'FU.ClassFeatureArcanumSummonMessage',
					details: selectedArcana.system.data.merge,
				});
				CommonSections.content(renderData.sections, content, CHECK_DETAILS);
				CommonSections.expense(renderData, actor, item, [], flags, expense);
				await CommonEvents.feature(actor, item, expense.traits, renderData);
				const builder = new FUChatBuilder(actor, item).withData(renderData).withFlags(flags);
				await builder.create();
			} else {
				ui.notifications.error(`Failed to resolve the arcana from the selection.`);
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
	const items = actor.itemTypes;
	const subtype = ClassFeatureRegistry.instance.qualify('therioform');
	/** @type {FUItem[]} **/
	const classFeatures = items.classFeature.filter((it) => it.system.featureType === subtype);
	/** @type ItemSelectionData **/
	const data = {
		title: `${StringUtils.localize('FU.ClassFeatureTherioformLabel')}`,
		message: StringUtils.localize('FU.ClassFeatureTherioformHint'),
		items: classFeatures,
		getDescription: async (item) => {
			return await FoundryUtils.enrichText(item.parent.system.description, {
				relativeTo: actor,
			});
		},
	};

	const dialog = new ItemSelectionDialog(data);
	const selectedForms = await dialog.open();
	if (selectedForms) {
		await actor.update({
			'system.equipped.therioforms': selectedForms.map(({ id }) => id),
		});

		// Calculate theriomorphosis cost
		// If the item passed in has a cost, use it.
		/** @type ResourceExpense **/
		const therioformCost = {
			resource: item.system.cost.resource ?? 'hp',
			amount: item.system.cost.amount ?? 0,
			traits: [FeatureTraits.TherioformManifest],
		};
		const expense = await ResourcePipeline.calculateExpense(therioformCost, actor, item, []);
		await CommonEvents.calculateExpense(actor, item, [], expense);
		console.debug(`Theriomorphosis cost: ${expense.amount}`);
		// Render sections
		/** @type {FURenderData} **/
		const renderData = {
			tags: [],
			sections: [],
			postRenderActions: [],
			flags: [],
		};
		let flags = {};

		CommonSections.itemFlavor(renderData.sections, item);
		const content = await FoundryUtils.renderTemplate('feature/mutant/chat-therioform-manifest', {
			actor: actor,
			description: item.system.description,
			forms: selectedForms,
		});
		CommonSections.content(renderData.sections, content, CHECK_DETAILS);
		if (expense.amount > 0) {
			CommonSections.expense(renderData, actor, item, [], flags, expense);
		}
		await CommonEvents.feature(actor, item, expense.traits, renderData);
		const builder = new FUChatBuilder(actor, item).withData(renderData).withFlags(flags);
		await builder.create();
	} else {
		await actor.update({
			'system.equipped.therioforms': [],
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
		.setFlag(Flags.ChatMessage.Application, name)
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
