import { FU, SYSTEM } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { DamagePipeline, DamageRequest } from '../pipelines/damage-pipeline.mjs';
import { Flags } from './flags.mjs';
import { DamageData } from '../checks/damage-data.mjs';
import { StringUtils } from './string-utils.mjs';
import { HTMLUtils } from './html-utils.mjs';
import { DamageCustomizerV2 } from '../ui/damage-customizer-v2.mjs';
import { DamageTraits } from '../pipelines/traits.mjs';

const INLINE_DAMAGE = 'InlineDamage';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineDamageEnricher = {
	id: 'InlineDamageEnricher',
	// TODO: Update pattern to allow for specifying category if applicable
	pattern: InlineHelper.compose('DMG', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: damageEnricher,
	onRender: onRender,
};

// TODO: Add onRender, but need to pass sourceInfo onto the dataset

function damageEnricher(text, options) {
	console.log('Parsing damage enricher:', text);
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

		InlineHelper.appendSystemIcon(anchor, 'damage');

		// TOOLTIP
		anchor.setAttribute(
			'data-tooltip',
			StringUtils.localize('FU.ChatApplyDamageTooltip', {
				amount: amount,
				type: type,
			}),
		);
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
		InlineHelper.appendSystemIcon(anchor, type);
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
		const keyboardModifiers = HTMLUtils.getKeyboardModifiers(event);
		let targets = await targetHandler();
		if (targets.length > 0) {
			let context = ExpressionContext.fromSourceInfo(renderContext.sourceInfo, targets);
			let check = renderContext.document.getFlag(SYSTEM, Flags.ChatMessage.CheckV2);
			if (check) {
				context = context.withCheck(check);
			}
			let amount = await Expressions.evaluateAsync(renderContext.dataset.amount, context);
			const damageData = DamageData.construct(type, amount);
			let traits = [];
			// SHIFT: Ignore resistances
			if (keyboardModifiers.shift) {
				traits.push(DamageTraits.IgnoreResistances);
			}
			// CTRL: Customize the damage
			if (keyboardModifiers.ctrl) {
				damageData.unlock();
				await DamageCustomizerV2.open(damageData, context.item);
				// SHIFT: Ignore resistances
				if (keyboardModifiers.shift) {
					traits.push(DamageTraits.IgnoreImmunities);
				}
			}
			// Check source actor for outgoing damage bonuses
			if (context.actor) {
				DamagePipeline.collectOutgoingBonuses(context.actor, damageData);
			}
			const request = new DamageRequest(renderContext.sourceInfo, targets, damageData);
			request.addTraits(traits);
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
