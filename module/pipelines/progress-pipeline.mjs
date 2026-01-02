/**
 * @returns {ChatAction}
 */
import { StringUtils } from '../helpers/string-utils.mjs';
import { Flags } from '../helpers/flags.mjs';
import { systemId } from '../helpers/system-utils.mjs';
import { Pipeline } from './pipeline.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';
import { ChatAction } from '../helpers/chat-action.mjs';

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
		actor.updateProgress(id, increment);
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

export const ProgressPipeline = {
	initialize,
	getAdvanceTargetedAction,
};
