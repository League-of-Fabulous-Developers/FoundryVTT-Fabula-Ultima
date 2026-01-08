import { FU, SYSTEM } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { DamagePipeline, DamageRequest } from '../pipelines/damage-pipeline.mjs';
import { systemAssetPath } from './system-utils.mjs';
import { Flags } from './flags.mjs';
import { DamageData } from '../checks/damage-data.mjs';

const INLINE_DAMAGE = 'InlineDamage';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineDamageEnricher = {
	id: 'InlineDamageEnricher',
	pattern: InlineHelper.compose('DMG', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: damageEnricher,
	onRender: onRender,
};

// TODO: Add onRender, but need to pass sourceInfo onto the dataset

function damageEnricher(text, options) {
	const amount = text[1];
	const type = text[2].toLowerCase();
	const label = text.groups.label;
	const traits = text.groups.traits;

	if (type in FU.damageTypes) {
		const anchor = document.createElement('a');
		anchor.classList.add('inline', 'inline-damage');
		anchor.dataset.type = type;
		anchor.dataset.traits = traits;
		if (label) {
			anchor.dataset.label = label;
		}
		anchor.draggable = true;

		InlineHelper.appendImage(anchor, systemAssetPath('icons/inline/damage.svg'));
		// TOOLTIP
		anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineDamage')} (${amount})`);
		if (label) {
			anchor.append(label);
			anchor.dataset.amount = amount;
		} else {
			// AMOUNT
			InlineHelper.appendAmountToAnchor(anchor, amount);
			// TYPE
			anchor.append(` ${game.i18n.localize(FU.damageTypes[type])}`);
		}

		// ICON
		const icon = document.createElement('i');
		icon.className = FU.affIcon[type] ?? '';
		anchor.append(icon);
		return anchor;
	}

	return null;
}

/**
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);
	const type = renderContext.dataset.type;

	element.addEventListener('click', async function (event) {
		let targets = await targetHandler();
		if (targets.length > 0) {
			let context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
			let check = renderContext.document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			if (check) {
				context = context.withCheck(check);
			}
			let amount = await Expressions.evaluateAsync(renderContext.dataset.amount, context);
			const damageData = DamageData.construct(type, amount);
			// Check source actor for outgoing damage bonuses
			if (context.actor) {
				DamagePipeline.collectOutgoingBonuses(context.actor, damageData);
			}
			const request = new DamageRequest(renderContext.sourceInfo, targets, damageData);
			if (renderContext.dataset.traits) {
				request.addTraits(...renderContext.dataset.traits.split(','));
			}

			await DamagePipeline.process(request);
		}
	});

	// Handle dragstart
	element.addEventListener('dragstart', async function (event) {
		const sourceInfo = InlineHelper.determineSource(document, renderContext.target);

		const data = {
			type: INLINE_DAMAGE,
			_sourceInfo: sourceInfo,
			damageType: renderContext.dataset.type,
			amount: renderContext.dataset.amount,
			traits: renderContext.dataset.traits,
		};

		event.dataTransfer.setData('text/plain', JSON.stringify(data));
		event.stopPropagation();
	});
}

async function onDropActor(actor, sheet, { type, damageType, amount, _sourceInfo, traits, ignore }) {
	if (type === INLINE_DAMAGE) {
		// Need to rebuild the class after it was deserialized
		const sourceInfo = InlineSourceInfo.fromObject(_sourceInfo);
		const context = ExpressionContext.sourceInfo(sourceInfo, [actor]);
		const _amount = await Expressions.evaluateAsync(amount, context);
		const damageData = { type: damageType, total: _amount, modifierTotal: 0 };

		const request = new DamageRequest(sourceInfo, [actor], damageData);
		if (traits) {
			request.addTraits(...traits.split(','));
		}

		DamagePipeline.process(request);
		return false;
	}
}

/**
 * @type {FUInlineCommand}
 */
export const InlineDamage = Object.freeze({
	enrichers: [inlineDamageEnricher],
	onDropActor,
});
