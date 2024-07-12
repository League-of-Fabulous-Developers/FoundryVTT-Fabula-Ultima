import { FU, SYSTEM } from './config.mjs';
import { applyDamage } from './apply-damage.mjs';
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
 * @param {HTMLElement} element
 * @returns {string}
 */
function determineSource(document, element) {
	let source = game.i18n.localize('FU.UnknownDamageSource');
	if (document instanceof FUActor) {
		const itemId = $(element).closest('[data-item-id]').data('itemId');
		if (itemId) {
			source = document.items.get(itemId).name;
		} else {
			source = document.name;
		}
	} else if (document instanceof FUItem) {
		source = document.name;
	} else if (document instanceof ChatMessage) {
		const speakerActor = ChatMessage.getSpeakerActor(document.speaker);
		if (speakerActor) {
			source = speakerActor.name;
		}
		const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
		if (item) {
			source = item.name;
		}
	}
	return source;
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
		.on('click', function () {
			const amount = Number(this.dataset.amount);
			const type = this.dataset.type;
			const user = game.user;
			const source = determineSource(document, this);
			const controlledTokens = canvas.tokens.controlled;
			let actors = [];

			// Use selected token or owned actor
			if (controlledTokens.length > 0) {
				actors = controlledTokens.map((token) => token.actor);
			} else {
				const actor = user.character;
				if (actor) {
					actors.push(actor);
				}
			}

			if (actors.length > 0) {
				applyDamage(actors, type, amount, {}, source || 'inline damage');
			} else {
				ui.notifications.warn('FU.ChatApplyDamageNoActorsSelected', { localize: true });
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}
			const source = determineSource(document, this);

			const data = {
				type: INLINE_DAMAGE,
				source: source,
				damageType: this.dataset.type,
				amount: this.dataset.amount,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
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
