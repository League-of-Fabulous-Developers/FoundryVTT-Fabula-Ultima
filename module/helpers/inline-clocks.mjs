import { InlineHelper } from './inline-helper.mjs';
import { StringUtils } from './string-utils.mjs';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineCheckEnricher = {
	pattern: InlineHelper.compose('CLOCK', '\\s*(?<id>[a-zA-Z-,]+)\\s+(?<step>[0-9-]+?)'),
	enricher: checkEnricher,
};

/**
 * @param {RegExpMatchArray} match The text within a chat message that matches the given pattern
 * @param {*} options
 * @returns A formatted html element
 */
function checkEnricher(match, options) {
	const id = match.groups.id;
	const step = match.groups.step;

	if (id && step) {
		const label = match.groups.label;
		const anchor = document.createElement('a');
		anchor.dataset.id = id;
		anchor.dataset.step = step;
		anchor.classList.add('inline', 'inline-clock');

		if (label) {
			anchor.append(label);
			anchor.dataset.label = label;
		} else {
			anchor.append(`${StringUtils.kebabToPascal(id)} ${step}`);
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
			const step = Number(this.dataset.step);
			await actor.updateClockByFuid(id, step);
			const clock = actor.getClockByFuid(id);
			const item = sourceInfo.resolveItem();
			await render(clock, step, actor, item);
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
async function render(progress, step, actor, item) {
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
