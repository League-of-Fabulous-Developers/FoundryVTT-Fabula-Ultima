import { FU } from './config.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { ExpressionContext, Expressions } from '../expressions/expressions.mjs';
import { DamagePipeline, DamageRequest } from '../pipelines/damage-pipeline.mjs';

const INLINE_DAMAGE = 'InlineDamage';

/**
 * @typedef SourceInfo
 * @prop {string | null} uuid
 * @prop {string | null} name
 */

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineDamageEnricher = {
	pattern: InlineHelper.compose('DMG', '\\s*(?<amount>\\(?.*?\\)*?)\\s(?<type>\\w+?)'),
	enricher: enricher,
};

function enricher(text, options) {
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
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	// TODO: Refactor to not have to repeat self across click and drag events
	html.find('a.inline.inline-damage[draggable]')
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				// TODO: Verify
				//sourceInfo.name = this.dataset.label ? this.dataset.label : sourceInfo.name;
				const type = this.dataset.type;
				const context = ExpressionContext.fromSourceInfo(sourceInfo, targets);
				const amount = await Expressions.evaluateAsync(this.dataset.amount, context);

				const damageData = { type, total: amount, modifierTotal: 0 };
				const request = new DamageRequest(sourceInfo, targets, damageData);
				if (this.dataset.traits) {
					request.addTraits(...this.dataset.traits.split(','));
				}
				await DamagePipeline.process(request);
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = InlineHelper.determineSource(document, this);
			sourceInfo.name = this.dataset.label ? this.dataset.label : sourceInfo.name;
			const data = {
				type: INLINE_DAMAGE,
				_sourceInfo: sourceInfo,
				damageType: this.dataset.type,
				amount: this.dataset.amount,
				traits: this.dataset.traits,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

// TODO: Implement
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

export const InlineDamage = {
	enricher: inlineDamageEnricher,
	activateListeners,
	onDropActor,
};
