/**
 * @returns {ChatAction}
 */
import { StringUtils } from '../helpers/string-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { systemId } from '../helpers/system-utils.mjs';
import { Pipeline } from './pipeline.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';
import { ObjectUtils } from '../helpers/object-utils.mjs';
import { getSelected } from '../helpers/target-handler.mjs';
import { CheckPrompt } from '../checks/check-prompt.mjs';
import { Checks } from '../checks/checks.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';
import FoundryUtils from '../helpers/foundry-utils.mjs';

/**
 * @param {FUActor} actor
 * @param {String} id
 * @param {Number} increment
 * @param {String} source
 * @returns {ChatAction}
 */
function getAdvanceTargetedAction(actor, id, increment, source) {
	const icon = 'fa fa-clock';
	const progress = actor.resolveProgress('brainwave-clock');
	const tooltip = StringUtils.localize('FU.ProgressAdvance', {
		name: progress.name,
	});
	return new ChatAction('advanceProgress', icon, tooltip, {
		id: id,
		increment: increment,
		source: source,
	})
		.setFlag(Flags.ChatMessage.Progress)
		.forActor(actor)
		.withLabel(tooltip)
		.withSelected()
		.requiresOwner();
}

/**
 * @param {Document} document
 * @param {String} propertyPath
 * @param {number} index
 */
async function promptCheckAtIndexForDocument(document, propertyPath, index) {
	if (index === undefined) {
		throw Error('Undefined index reference was given');
	}

	const property = ObjectUtils.getProperty(document, propertyPath);
	/** @type ProgressDataModel[] **/
	const tracks = foundry.utils.duplicate(property);
	const track = tracks[index];
	const actors = await getSelected(false);

	const prompt = await CheckPrompt.promptForConfigurationV2(
		document,
		'attribute',
		{
			primary: 'dex',
			secondary: 'ins',
			title: `FU.DialogCheckRoll`,
			label: track.name,
			increment: true,
			difficulty: 10,
			modifier: 0,
		},
		actors,
	);
	if (prompt) {
		// Execute check directly for each actor
		if (actors.length > 0) {
			console.debug(`Rolling check for progress track at ${propertyPath} from check: ${prompt} on actors.`);
			for (const actor of actors) {
				const attributes = {
					primary: prompt.primary,
					secondary: prompt.secondary,
				};
				await Checks.attributeCheck(
					actor,
					attributes,
					null,
					(check) => {
						const config = CheckConfiguration.configure(check);
						config.setDifficulty(prompt.difficulty);
						config.setLabel(prompt.label);
						config.addModifier('FU.DialogCheckModifier', prompt.modifier);
					},
					async (check) => {
						if (check.fumble || check.result < prompt.difficulty) {
							return;
						}
						let increment = this.calculateChange(check.result, prompt.difficulty, check.critical);
						if (prompt.increment === 'false') {
							increment = -increment;
						}
						await this.updateAtIndexForDocument(document, propertyPath, index, increment, {
							source: actor,
						});
					},
				);
			}
		} else {
			console.debug(`Prompting a request to roll a check for progress track at ${propertyPath} from check: ${prompt}`);
			ChatMessage.create({
				speaker: ChatMessage.getSpeaker(),
				content: await FoundryUtils.renderTemplate('chat/chat-prompt-check', {
					document: document,
					uuid: document.uuid,
					propertyPath: propertyPath,
					index: index,
					track: track,
					segments: this.generateProgressArray(track),
					label: prompt.label,
					primary: prompt.primary,
					secondary: prompt.secondary,
					difficulty: prompt.difficulty,
					modifier: prompt.modifier,
					increment: prompt.increment,
					verb: StringUtils.localize(prompt.increment ? 'FU.Increment' : 'FU.Decrement').toLowerCase(),
				}),
			});
		}
	}
}

/**
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
	if (!message.getFlag(systemId, Flags.ChatMessage.Progress)) {
		return;
	}

	Pipeline.handleClick(message, html, 'advanceProgress', async (dataset) => {
		/** @type {FUActor} **/
		const fields = StringUtils.fromBase64(dataset.fields);
		const id = fields.id;
		const increment = fields.increment;
		const source = fields.source;

		const targets = await Pipeline.getTargetsFromAction(dataset);
		const actor = targets[0];
		await actor.updateProgress(id, increment);
		const track = actor.resolveProgress(id);
		await ProgressDataModel.notifyUpdate(actor, track, increment, source);
	});
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessageHTML', onRenderChatMessage);
}

export const ProgressPipeline = Object.freeze({
	initialize,
	getAdvanceTargetedAction,
	promptCheckAtIndexForDocument,
});
