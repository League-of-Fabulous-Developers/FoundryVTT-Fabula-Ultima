import { FU } from './config.mjs';
import { applyDamage } from './apply-damage.mjs';
import { SYSTEM } from '../settings.js';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';

const INLINE_DAMAGE = 'InlineDamage';

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
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find('a.inline.inline-damage[draggable]').on('dragstart', function (event) {
		/** @type DragEvent */
		event = event.originalEvent;
		if (!(event.target instanceof HTMLElement) || !event.dataTransfer) {
			return;
		}
		let source = game.i18n.localize('FU.UnknownDamageSource');
		if (document instanceof FUActor || document instanceof FUItem) {
			source = document.name;
		} else if (document instanceof ChatMessage) {
			const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
			if (speakerActor) {
				source = speakerActor.name;
				const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
				if (item) {
					source = item.name;
				}
			}
		}

		const data = {
			type: INLINE_DAMAGE,
			source: source,
			damageType: this.dataset.type,
			amount: this.dataset.amount,
		};
		event.dataTransfer.setData('text/plain', JSON.stringify(data));
	});
}

function onDropActor(actor, sheet, { type, damageType, amount, source, ignore }) {
	if (type === INLINE_DAMAGE) {
		applyDamage([actor], damageType, Number(amount), {}, source || 'something');
		return false;
	}
}

export const InlineDamage = {
	enricher: inlineDamageEnricher,
	activateListeners,
	onDropActor,
};
