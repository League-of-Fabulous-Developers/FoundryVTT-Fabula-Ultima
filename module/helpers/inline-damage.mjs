import { FU } from './config.mjs';
import { applyDamagePipelineWithHook } from './apply-damage.mjs';
import { targetHandler } from './target-handler.mjs';
import { InlineAmount, InlineContext, InlineHelper } from './inline-helper.mjs';

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
	pattern: /@DMG\[\s*(?<amount>\(?.*?\)*?)\s(?<type>\w+?)]\B/g,
	enricher: enricher,
};

function enricher(text, options) {
	const amount = text[1];
	const type = text[2];

	if (type in FU.damageTypes) {
		const anchor = document.createElement('a');
		anchor.classList.add('inline', 'inline-damage');
		anchor.dataset.type = type;
		anchor.draggable = true;

		// TOOLTIP
		anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineDamage')} (${amount})`);
		// AMOUNT
		InlineAmount.appendToAnchor(anchor, amount);
		// TYPE
		anchor.append(` ${game.i18n.localize(FU.damageTypes[type])}`);
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

	html.find('a.inline.inline-damage[draggable]')
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const type = this.dataset.type;
				const context = new InlineContext(sourceInfo.actor, sourceInfo.item, targets);
				const amount = new InlineAmount(this.dataset.amount);
				const _total = amount.evaluate(context);

				const baseDamageInfo = { type, total: _total, modifierTotal: 0 };
				await applyDamagePipelineWithHook({ event: null, targets, sourceUuid: sourceInfo.uuid, sourceName: sourceInfo.name || 'inline damage', baseDamageInfo, extraDamageInfo: {}, clickModifiers: null });
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
				type: INLINE_DAMAGE,
				source: sourceInfo,
				damageType: this.dataset.type,
				amount: this.dataset.amount,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

// TODO: Implement
function onDropActor(actor, sheet, { type, damageType, amount, source, ignore }) {
	if (type === INLINE_DAMAGE) {
		const context = new InlineContext(source.actor, source.item, [actor]);
		const _amount = new InlineAmount(amount);
		const _total = _amount.evaluate(context);
		const baseDamageInfo = { type: damageType, total: _total, modifierTotal: 0 };
		applyDamagePipelineWithHook({ event: null, targets: [actor], sourceUuid: source.uuid, sourceName: source.name || 'inline damage', baseDamageInfo, extraDamageInfo: {}, clickModifiers: null });
		return false;
	}
}

export const InlineDamage = {
	enricher: inlineDamageEnricher,
	activateListeners,
	onDropActor,
};
