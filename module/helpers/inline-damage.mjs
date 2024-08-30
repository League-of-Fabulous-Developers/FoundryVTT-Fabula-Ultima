import { FU, SYSTEM } from './config.mjs';
import { applyDamagePipelineWithHook } from './apply-damage.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { targetHandler } from './target-handler.mjs';

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
	pattern: /@DMG\[(\d+) (\w+?)]/g,
	enricher: enricher,
};

function enricher(text, options) {
	const amount = Number(text[1]);
	const type = text[2];

	if (type in FU.damageTypes && !Number.isNaN(amount)) {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.dataset.amount = amount;
		anchor.draggable = true;
		anchor.classList.add('inline', 'inline-damage');
		anchor.append(`${amount} ${game.i18n.localize(FU.damageTypes[type])}`);
		const icon = document.createElement('i');
		icon.className = FU.affIcon[type] ?? '';
		anchor.append(icon);
		return anchor;
	}
	return null;
}

/**
 * @param {ClientDocument} document
 * @param {HTMLElement} element
 * @returns {SourceInfo}
 */
function determineSource(document, element) {
	let source = game.i18n.localize('FU.UnknownDamageSource');
	let sourceUuid = null;
	if (document instanceof FUActor) {
		const itemId = $(element).closest('[data-item-id]').data('itemId');
		if (itemId) {
			const item = document.items.get(itemId);
			source = item.name;
			sourceUuid = item.uuid;
		} else {
			source = document.name;
			sourceUuid = document.uuid;
		}
	} else if (document instanceof FUItem) {
		source = document.name;
		sourceUuid = document.uuid;
	} else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			source = speakerActor.name;
			sourceUuid = speakerActor.uuid;
		}
		const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (item) {
			source = item.name;
			sourceUuid = item.uuid;
		}
	}
	/** @type {SourceInfo} */
	const result = {
		uuid: sourceUuid,
		name: source
	};
	return result;
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
			const amount = Number(this.dataset.amount);
			const type = this.dataset.type;
			const sourceInfo = determineSource(document, this);
			let targets = await targetHandler();
			if (targets.length > 0) {
				const baseDamageInfo = { type, total: amount, modifierTotal: 0 };
				await applyDamagePipelineWithHook({ event: null, targets, sourceUuid: sourceInfo.uuid, sourceName: sourceInfo.name || 'inline damage', baseDamageInfo, extraDamageInfo: {}, clickModifiers: null });
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = determineSource(document, this);
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

function onDropActor(actor, sheet, { type, damageType, amount, source, ignore }) {
	if (type === INLINE_DAMAGE) {
		const baseDamageInfo = { type: damageType, total: Number(amount), modifierTotal: 0 };
		applyDamagePipelineWithHook({ event: null, targets: [actor], sourceUuid: source.uuid, sourceName: source.name || 'inline damage', baseDamageInfo, extraDamageInfo: {}, clickModifiers: null });
		return false;
	}
}

export const InlineDamage = {
	enricher: inlineDamageEnricher,
	activateListeners,
	onDropActor,
};
