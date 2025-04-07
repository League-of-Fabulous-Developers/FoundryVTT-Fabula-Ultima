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
					// Evaluate the given value
					const targets = await targetHandler();
					const context = ExpressionContext.fromUuid(sourceInfo.actorUuid, sourceInfo.itemUuid, targets);
					const value = await Expressions.evaluateAsync(this.dataset.value, context);

					// TODO: Display notifications?
					// Validate progress won't go below min or max
					let progress = await actor.getSingleItemByFuid(id).getProgress();
					if (progress.isMaximum && value > 0) {
						ui.notifications.info('FU.ChatProgressAtMaximum', { localize: true });
						return;
					}
					if (progress.isMinimum && value < 0) {
						ui.notifications.info('FU.ChatProgressAtMinimum', { localize: true });
						return;
					}

					const step = Number(value);
					const item = sourceInfo.resolveItem();
					progress = await actor.updateProgressByFuid(id, step);
					await renderStep(progress, step, actor, item);
					break;
				}

				case 'reset': {
					const clock = actor.getSingleItemByFuid(id).getProgress();
					await actor.updateProgressByFuid(id, -clock.current);
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
 * @param {FUItem} item
 * @returns {Promise<string>}
 */
async function renderStep(progress, step, actor, item) {
	// Generate and reverse the progress array
	const progressArr = progress.generateProgressArray();
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		content: await renderTemplate('systems/projectfu/templates/chat/chat-advance-clock.hbs', {
			message: step > 0 ? 'FU.ChatIncrementClock' : 'FU.ChatDecrementClock',
			step: step,
			clock: progress.name ?? progress.parent.parent.name,
			source: item.name,
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
