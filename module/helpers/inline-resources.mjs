import { FU } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineHelper } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { ResourcePipeline, ResourceRequest } from '../pipelines/resource-pipeline.mjs';

const INLINE_RECOVERY = 'InlineRecovery';
const INLINE_LOSS = 'InlineLoss';

const classInlineRecovery = 'inline-recovery';
const classInlineLoss = 'inline-loss';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineRecoveryEnricher = {
	pattern: /@(?:HEAL|GAIN)\[\s*(?<amount>\(?.*?\)*?)\s(?<type>\w+?)]/gi,
	enricher: recoveryEnricher,
};

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineLossEnricher = {
	pattern: /@LOSS\[\s*(?<amount>\(?.*?\)*?)\s(?<type>\w+?)]/gi,
	enricher: lossEnricher,
};

function createReplacementElement(amount, type, elementClass, uncapped, tooltip) {
	if (type in FU.resources) {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.setAttribute('data-tooltip', `${game.i18n.localize(tooltip)} (${amount})`);

		// Used to enable over-healing
		if (uncapped === true) {
			anchor.dataset.uncapped = 'true';
		}
		anchor.draggable = true;
		anchor.classList.add('inline', elementClass);

		const indicator = document.createElement('i');
		indicator.classList.add('indicator');
		anchor.append(indicator);

		// AMOUNT
		InlineHelper.appendAmountToAnchor(anchor, amount);
		// TYPE
		anchor.append(` ${game.i18n.localize(FU.resourcesAbbr[type])}`);
		// ICON
		const icon = document.createElement('i');
		icon.className = FU.resourceIcons[type];
		icon.classList.add(type);
		anchor.append(icon);

		return anchor;
	} else {
		return null;
	}
}

function recoveryEnricher(text, options) {
	// Detect and handle uncapped recovery
	let uncapped = false;
	if (text[1].match(/^\d+\+$/)) {
		uncapped = true;
		text[1] = text[1].slice(0, -1);
	}

	const amount = text[1];
	const type = text[2];
	return createReplacementElement(amount, type.toLowerCase(), classInlineRecovery, uncapped, `FU.InlineRecovery`);
}

function lossEnricher(text, options) {
	const amount = text[1];
	const type = text[2];
	return createReplacementElement(amount, type.toLowerCase(), classInlineLoss, false, `FU.InlineLoss`);
}

/**
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find('a.inline.inline-recovery[draggable], a.inline.inline-loss[draggable]')
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const type = this.dataset.type;
				const uncapped = this.dataset.uncapped === 'true';
				const context = ExpressionContext.fromUuid(sourceInfo.actorUuid, sourceInfo.itemUuid, targets);
				const amount = await Expressions.evaluate(this.dataset.amount, context);

				if (this.classList.contains(classInlineRecovery)) {
					await applyRecovery(sourceInfo, targets, type, amount, uncapped);
				} else if (this.classList.contains(classInlineLoss)) {
					await applyLoss(sourceInfo, targets, type, amount);
				}
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = InlineHelper.determineSource(document, this);
			const data = {
				type: this.classList.contains(classInlineRecovery) ? INLINE_RECOVERY : INLINE_LOSS,
				sourceInfo: sourceInfo,
				recoveryType: this.dataset.type,
				amount: this.dataset.amount,
				uncapped: this.dataset.uncapped === 'true',
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

async function onDropActor(actor, sheet, { type, recoveryType, amount, sourceInfo, uncapped }) {
	if (sourceInfo === undefined) {
		return true;
	}

	const context = ExpressionContext.fromUuid(sourceInfo.actorUuid, sourceInfo.itemUuid, [actor]);
	amount = await Expressions.evaluate(amount, context);

	if (type === INLINE_RECOVERY && !Number.isNaN(amount)) {
		applyRecovery(sourceInfo, [actor], recoveryType, amount, uncapped);
		return false;
	} else if (type === INLINE_LOSS && !Number.isNaN(amount)) {
		applyLoss(sourceInfo, [actor], recoveryType, amount);
		return false;
	}
}

async function applyRecovery(sourceInfo, targets, resourceType, amount, uncapped) {
	const request = new ResourceRequest(sourceInfo, targets, resourceType, amount, uncapped);
	return ResourcePipeline.processRecovery(request);
}

async function applyLoss(sourceInfo, targets, resourceType, amount) {
	const request = new ResourceRequest(sourceInfo, targets, resourceType, amount);
	return ResourcePipeline.processLoss(request);
}

export const InlineResources = {
	enrichers: [inlineRecoveryEnricher, inlineLossEnricher],
	activateListeners,
	onDropActor,
};
