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
	pattern: InlineHelper.compose('(?:HEAL|GAIN)', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: recoveryEnricher,
};

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineLossEnricher = {
	pattern: InlineHelper.compose('LOSS', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: lossEnricher,
};

function createReplacementElement(amount, type, elementClass, uncapped, tooltip, label) {
	if (type in FU.resources) {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.setAttribute('data-tooltip', `${game.i18n.localize(tooltip)} (${amount} ${type})`);

		// Used to enable over-healing
		if (uncapped === true) {
			anchor.dataset.uncapped = 'true';
		}
		anchor.draggable = true;
		anchor.classList.add('inline', elementClass);

		// INDICATOR
		const indicator = document.createElement('i');
		indicator.classList.add('indicator');
		anchor.append(indicator);
		if (label) {
			anchor.append(label);
			anchor.dataset.label = label;
			anchor.dataset.amount = amount;
		} else {
			// AMOUNT
			InlineHelper.appendAmountToAnchor(anchor, amount);
			// TYPE
			anchor.append(` ${game.i18n.localize(FU.resourcesAbbr[type])}`);
		}
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
	const label = text.groups.label;
	return createReplacementElement(amount, type.toLowerCase(), classInlineRecovery, uncapped, `FU.InlineRecovery`, label);
}

function lossEnricher(text, options) {
	const amount = text[1];
	const type = text[2];
	const label = text.groups.label;
	return createReplacementElement(amount, type.toLowerCase(), classInlineLoss, false, `FU.InlineLoss`, label);
}

/**
 * @param {ClientDocument} document
 * @param {HTMLElement} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	// Select all relevant inline recovery and loss anchors
	const elements = html.querySelectorAll('a.inline.inline-recovery[draggable], a.inline.inline-loss[draggable]');
	elements.forEach((el) => {
		el.addEventListener('click', async function () {
			const targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				sourceInfo.name = this.dataset.label || sourceInfo.name;
				const type = this.dataset.type;
				const uncapped = this.dataset.uncapped === 'true';
				const context = ExpressionContext.fromSourceInfo(sourceInfo, targets);
				const amount = await Expressions.evaluateAsync(this.dataset.amount, context);

				if (this.classList.contains(classInlineRecovery)) {
					await applyRecovery(sourceInfo, targets, type, amount, uncapped);
				} else if (this.classList.contains(classInlineLoss)) {
					await applyLoss(sourceInfo, targets, type, amount);
				}
			}
		});

		el.addEventListener('dragstart', function (event) {
			if (!(this instanceof HTMLElement) || !event.dataTransfer) return;

			const sourceInfo = InlineHelper.determineSource(document, this);
			sourceInfo.name = this.dataset.label || sourceInfo.name;

			const data = {
				type: this.classList.contains(classInlineRecovery) ? INLINE_RECOVERY : INLINE_LOSS,
				sourceInfo,
				recoveryType: this.dataset.type,
				amount: this.dataset.amount,
				uncapped: this.dataset.uncapped === 'true',
			};

			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
	});
}

async function onDropActor(actor, sheet, { type, recoveryType, amount, sourceInfo, uncapped }) {
	if (sourceInfo === undefined) {
		return true;
	}

	if (type === INLINE_RECOVERY && !Number.isNaN(amount)) {
		const context = ExpressionContext.fromSourceInfo(sourceInfo, [actor]);
		amount = await Expressions.evaluateAsync(amount, context);
		await applyRecovery(sourceInfo, [actor], recoveryType, amount, uncapped);
		return false;
	} else if (type === INLINE_LOSS && !Number.isNaN(amount)) {
		const context = ExpressionContext.fromSourceInfo(sourceInfo, [actor]);
		amount = await Expressions.evaluateAsync(amount, context);
		await applyLoss(sourceInfo, [actor], recoveryType, amount);
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
