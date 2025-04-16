import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { targetHandler } from './target-handler.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	pattern: InlineHelper.compose('(CLOCK|PROGRESS)', '\\s*(?<id>[a-zA-Z-,]+)\\s+(?<command>[a-zA-Z]+?)(\\s+(?<value>.*?))?'),
	enricher: checkEnricher,
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
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find('a.inline.inline-clock').on('click', async function (event) {
		const sourceInfo = InlineHelper.determineSource(document, this);
		const actor = sourceInfo.resolveActor();
		if (actor) {
			const id = this.dataset.id;
			const command = this.dataset.command;

			switch (command) {
				case 'update': {
					// Resolve the progress data from the actor
					let progress = await actor.resolveProgress(id);
					if (!progress) {
						const missingItemErrorMessage = game.i18n.localize('FU.ChatMissingItemWithId');
						ui.notifications.error(`${missingItemErrorMessage}: '${id}'`, { localize: true });
						return;
					}

					// Evaluate the given value
					const targets = await targetHandler();
					const context = ExpressionContext.fromSourceInfo(sourceInfo, targets);
					const value = await Expressions.evaluateAsync(this.dataset.value, context);

					// Validate progress won't go below min or max
					if (progress.isMaximum && value > 0) {
						ui.notifications.info('FU.ChatProgressAtMaximum', { localize: true });
						return;
					}
					if (progress.isMinimum && value < 0) {
						ui.notifications.info('FU.ChatProgressAtMinimum', { localize: true });
						return;
					}

					// Now update
					const step = Number(value);
					let source;
					if (sourceInfo.hasItem) {
						source = sourceInfo.resolveItem();
					} else if (sourceInfo.hasEffect) {
						source = sourceInfo.resolveEffect();
					}
					progress = await actor.updateProgress(id, step);
					await renderStep(progress, step, actor, source);
					break;
				}

				case 'reset': {
					const clock = actor.resolveProgress(id);
					await actor.updateProgress(id, -clock.current);
					break;
				}
			}
		}
	});
}

/**
 * @param {ProgressDataModel} progress
 * @param {Number} step
 * @param {FUActor} actor
 * @param {Object} source
 * @returns {Promise<string>}
 */
async function renderStep(progress, step, actor, source) {
	// Generate and reverse the progress array
	const progressArr = progress.generateProgressArray();
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		content: await renderTemplate('systems/projectfu/templates/chat/chat-advance-clock.hbs', {
			message: step > 0 ? 'FU.ChatIncrementClock' : 'FU.ChatDecrementClock',
			step: step,
			clock: progress.name ?? progress.parent.parent.name,
			source: source.name,
			data: progress,
			arr: progressArr,
		}),
	});
}

/**
 * Used by the CONFIG.TextEditor to hook into Foundry's text editor templating system
 */
export const InlineClocks = {
	enricher: inlineCheckEnricher,
	activateListeners,
};
