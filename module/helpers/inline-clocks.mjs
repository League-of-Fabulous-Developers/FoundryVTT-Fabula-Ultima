import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { targetHandler } from './target-handler.mjs';
import { ProgressDataModel } from '../documents/items/common/progress-data-model.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const enricher = {
	id: 'inlineProgressEnricher',
	pattern: InlineHelper.compose('(CLOCK|PROGRESS)', '\\s*(?<id>[a-zA-Z-,]+)\\s+(?<command>[a-zA-Z]+?)(\\s+(?<value>.*?))?'),
	enricher: checkEnricher,
	onRender: onRender,
};

/**
 * @param {RegExpMatchArray} match The text within a chat message that matches the given pattern
 * @param {*} options
 * @returns A formatted html element
 */
function checkEnricher(match, options) {
	const id = match.groups.id;
	const command = match.groups.command;
	const value = match.groups.value;

	if (id && (value || command)) {
		const label = match.groups.label;
		const anchor = document.createElement('a');
		anchor.dataset.id = id;
		anchor.classList.add('inline', 'inline-clock');
		anchor.dataset.command = command;
		anchor.dataset.value = value;

		if (label) {
			anchor.append(label);
			anchor.dataset.label = label;
		} else {
			anchor.append(`${StringUtils.kebabToPascal(id)}`);
		}
		return anchor;
	}
}

/**
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);
	const id = renderContext.dataset.id;
	const command = renderContext.dataset.command;

	element.addEventListener('click', async function (event) {
		const actor = renderContext.sourceInfo.resolveActor();
		if (!actor) return;

		switch (command) {
			case 'update': {
				// Resolve the progress data from the actor
				let progress = await actor.resolveProgress(id);
				if (!progress) {
					const missingItemErrorMessage = game.i18n.localize('FU.ChatMissingItemWithId');
					ui.notifications.error(`${missingItemErrorMessage}: '${id}'`, { localize: true });
					return;
				}

				// Evaluate the value
				const targets = await targetHandler();
				const context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
				const value = await Expressions.evaluateAsync(renderContext.dataset.value, context);

				// Validate min/max
				if (progress.isMaximum && value > 0) {
					ui.notifications.info('FU.ChatProgressAtMaximum', { localize: true });
					return;
				}
				if (progress.isMinimum && value < 0) {
					ui.notifications.info('FU.ChatProgressAtMinimum', { localize: true });
					return;
				}

				// Apply update
				const step = Number(value);
				let source;
				if (renderContext.sourceInfo.hasItem) {
					source = renderContext.sourceInfo.resolveItem();
				} else if (renderContext.sourceInfo.hasEffect) {
					source = renderContext.sourceInfo.resolveEffect();
				}
				progress = await actor.updateProgress(id, step);
				await ProgressDataModel.notifyUpdate(actor, progress, step, source);
				break;
			}

			case 'reset': {
				const clock = actor.resolveProgress(id);
				await actor.updateProgress(id, -clock.current);
				break;
			}
		}
	});
}

/**
 * @type {FUInlineCommand}
 */
export const InlineClocks = Object.freeze({
	enrichers: [enricher],
});
