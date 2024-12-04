import { FU, SYSTEM } from './config.mjs';
import { applyDamagePipelineWithHook } from './apply-damage.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { targetHandler } from './target-handler.mjs';
import { ImprovisedEffect } from './improvised-effect.mjs';

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
	pattern: /@DMG\[(\w+) (\w+?)]/g,
	enricher: enricher,
};

function enricher(text, options) {
	const amount = text[1];
	const type = text[2];

	if (type in FU.damageTypes && !Number.isNaN(amount)) {
		const anchor = document.createElement('a');
		anchor.classList.add('inline', 'inline-damage');
		anchor.dataset.type = type;
		anchor.draggable = true;

		if (!appendAmount(anchor, amount)) {
			return null;
		}

		anchor.append(` ${game.i18n.localize(FU.damageTypes[type])}`);
		const icon = document.createElement('i');
		icon.className = FU.affIcon[type] ?? '';
		anchor.append(icon);
		return anchor;
	}

	return null;
}

/**
 * @param {HTMLAnchorElement}} anchor The root html element for this inline command
 * @param {*} amount An integer for the value OR an improvised effect label (minor,heavy,massive)
 * @returns {boolean} True if the amount was appended
 */
function appendAmount(anchor, amount) {
	if (amount in FU.improvisedEffect) {
		// TODO: Replace with icon?
		anchor.append(`${game.i18n.localize(FU.improvisedEffect[amount])}`);
		anchor.dataset.effect = amount;
		return true;
	} else {
		const amountNumber = Number(amount);
		if (!Number.isNaN(amount)) {
			anchor.dataset.amount = amountNumber;
			anchor.append(`${amount} `);
			return true;
		}
	}

	return false;
}

/**
 * @param {ClientDocument} document
 * @param {HTMLElement} element
 * @returns {SourceInfo}
 */
function determineSource(document, element) {
	let source = game.i18n.localize('FU.UnknownDamageSource');
	let sourceUuid = null;
	let actor = undefined;

	if (document instanceof FUActor) {
		actor = document;
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
			actor = speakerActor;
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
		name: source,
		actor: actor,
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
			const sourceInfo = determineSource(document, this);
			const type = this.dataset.type;
			let targets = await targetHandler();

			// Support for improvised effect calculation
			const effectAmount = ImprovisedEffect.calculateAmountFromContext(this.dataset.effect, sourceInfo.actor, targets);
			const amount = effectAmount ?? Number(this.dataset.amount);
			if (targets.length > 0) {
				const baseDamageInfo = { type, total: amount, modifierTotal: 0, effect: this.dataset.effect };
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
				effect: this.dataset.effect,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

function onDropActor(actor, sheet, { type, damageType, amount, source, ignore }) {
	if (type === INLINE_DAMAGE) {
		const effectAmount = ImprovisedEffect.calculateAmountFromContext(this.dataset.amount, null, [actor]);
		const baseDamageInfo = { type: damageType, total: effectAmount ?? Number(amount), modifierTotal: 0 };
		applyDamagePipelineWithHook({ event: null, targets: [actor], sourceUuid: source.uuid, sourceName: source.name || 'inline damage', baseDamageInfo, extraDamageInfo: {}, clickModifiers: null });
		return false;
	}
}

export const InlineDamage = {
	enricher: inlineDamageEnricher,
	activateListeners,
	onDropActor,
};
