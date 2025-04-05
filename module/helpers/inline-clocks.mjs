import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	pattern: InlineHelper.compose('CLOCK', '\\s*(?<id>[a-zA-Z-,]+)\\s+(?<command>[a-zA-Z]+?)\\s*(?<value>[0-9-]+?)?'),
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
			anchor.append(`${StringUtils.kebabToPascal(id)} ${value}`);
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
					const step = Number(this.dataset.value);
					const item = sourceInfo.resolveItem();
					await actor.updateClockByFuid(id, step);
					const clock = actor.getSingleItemByFuid(id).getClock();
					await renderStep(clock, step, actor, item);
					break;
				}

				case 'reset': {
					const clock = actor.getSingleItemByFuid(id).getClock();
					await actor.updateClockByFuid(id, -clock.current);
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
			clock: progress.parent.parent.name,
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
