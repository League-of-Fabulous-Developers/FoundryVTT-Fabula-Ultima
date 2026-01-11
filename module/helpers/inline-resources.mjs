import { FU, SYSTEM } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { ResourcePipeline, ResourceRequest } from '../pipelines/resource-pipeline.mjs';
import { Flags } from './flags.mjs';

const INLINE_RECOVERY = 'InlineRecovery';
const INLINE_LOSS = 'InlineLoss';

const classInlineRecovery = 'inline-recovery';
const classInlineLoss = 'inline-loss';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineRecoveryEnricher = {
	id: 'InlineRecovery',
	pattern: InlineHelper.compose('(?:HEAL|GAIN)', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: recoveryEnricher,
	onRender: onRender,
};

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineLossEnricher = {
	id: 'InlineLoss',
	pattern: InlineHelper.compose('LOSS', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: lossEnricher,
	onRender: onRender,
};

function getCurrencyLocalizationKey() {
	return game.settings.get('projectfu', 'optionRenameCurrency') || 'FU.Zenit';
}

function createReplacementElement(amount, type, elementClass, uncapped, tooltip, label) {
	if (type in FU.resources) {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;

		let typeName = game.i18n.localize(FU.resourcesAbbr[type]);
		if (type === 'zenit') {
			const currencyKey = getCurrencyLocalizationKey();
			typeName = game.i18n.localize(currencyKey);
		}

		anchor.setAttribute('data-tooltip', `${game.i18n.localize(tooltip)} (${amount} ${typeName})`);

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
			anchor.append(` ${typeName}`);
		}
		// ICON
		InlineHelper.appendIcon(anchor, type);

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
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);
	const target = element.firstElementChild;
	const type = renderContext.dataset.type;
	const uncapped = renderContext.dataset.uncapped === 'true';

	element.addEventListener('click', async function () {
		const targets = await targetHandler();
		if (targets.length > 0) {
			let context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
			let check = renderContext.document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			if (check) {
				context = context.withCheck(check);
			}
			const amount = await Expressions.evaluateAsync(renderContext.dataset.amount, context);

			if (target.classList.contains(classInlineRecovery)) {
				await applyRecovery(renderContext.sourceInfo, targets, type, amount, uncapped);
			} else if (target.classList.contains(classInlineLoss)) {
				await applyLoss(renderContext.sourceInfo, targets, type, amount);
			}
		}
	});

	element.addEventListener('dragstart', function (event) {
		const data = {
			type: target.classList.contains(classInlineRecovery) ? INLINE_RECOVERY : INLINE_LOSS,
			sourceInfo: renderContext.sourceInfo,
			recoveryType: renderContext.dataset.type,
			amount: renderContext.dataset.amount,
			uncapped: renderContext.dataset.uncapped === 'true',
		};

		event.dataTransfer.setData('text/plain', JSON.stringify(data));
		event.stopPropagation();
	});
}

async function onDropActor(actor, sheet, { type, recoveryType, amount, sourceInfo, uncapped }) {
	if (sourceInfo === undefined) {
		return true;
	}
	sourceInfo = InlineSourceInfo.fromObject(sourceInfo);

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

/**
 * @type {FUInlineCommand}
 */
export const InlineResources = {
	enrichers: [inlineRecoveryEnricher, inlineLossEnricher],
	onDropActor,
};
