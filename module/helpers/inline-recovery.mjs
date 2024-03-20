import { FU } from './config.mjs';
import { applyDamage } from './apply-damage.mjs';
import { SYSTEM } from '../settings.js';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';

const INLINE_RECOVERY = 'InlineRecovery';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineRecoveryEnricher = {
	pattern: /@HEAL\[(\d+) (\w+?)]/g,
	enricher: enricher,
};

const translations = {
	hp: 'FU.HealthPoints',
	mp: 'FU.MindPoints',
	ip: 'FU.InventoryPoints',
};

const classes = {
	hp: 'fas fa-heart',
	mp: 'fas fa-hat-wizard',
	ip: 'ra ra-gear-hammer',
};

const flavor = {
	hp: 'FU.HealthPointRecovery',
	mp: 'FU.MindPointRecovery',
	ip: 'FU.InventoryPointRecovery',
};

const messages = {
	hp: 'FU.HealthPointRecoveryMessage',
	mp: 'FU.MindPointRecoveryMessage',
	ip: 'FU.InventoryPointRecoveryMessage',
};

function enricher(text, options) {
	const amount = Number(text[1]);
	const type = text[2];

	if (['hp', 'mp', 'ip'].includes(type) && typeof amount === 'number') {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.dataset.amount = amount;
		anchor.draggable = true;
		anchor.classList.add('inline', 'inline-recovery');
		anchor.append(`${amount} ${game.i18n.localize(translations[type])}`);
		const icon = document.createElement('i');
		icon.className = classes[type];
		anchor.append(icon);
		return anchor;
	} else {
		return null;
	}
}

/**
 * @param {jQuery} html
 * @param {ClientDocument} document
 */
function activateListeners(html, document) {
	html.find('a.inline.inline-recovery[draggable]').on('dragstart', function (event) {
		/** @type DragEvent */
		event = event.originalEvent;
		if (!(event.target instanceof HTMLElement) || !event.dataTransfer) {
			return;
		}
		let source = game.i18n.localize('FU.UnknownRecoverySource');
		if (document instanceof FUActor || document instanceof FUItem) {
			source = document.name;
		} else if (document instanceof ChatMessage) {
			var speakerActor = ChatMessage.getSpeakerActor(document.speaker);
			if (speakerActor) {
				source = speakerActor.name;
				const item = document.getFlag(SYSTEM, Flags.ChatMessage.Item);
				if (item) {
					source = item.name;
				}
			}
		}

		const data = {
			type: INLINE_RECOVERY,
			source: source,
			recoveryType: this.dataset.type,
			amount: this.dataset.amount,
		};
		event.dataTransfer.setData('text/plain', JSON.stringify(data));
	});
}

function onDropActor(event, actor) {
	if (event.dataTransfer) {
		const data = TextEditor.getDragEventData(event);
		const { type, recoveryType, amount, source } = data;
		if (type === INLINE_RECOVERY) {
			return applyRecovery(actor, recoveryType, Number(amount), source || 'something');
		}
	}
}

async function applyRecovery(actor, type, amount, source) {
	const amountRecovered = Math.max(0, amount + actor.system.bonuses.recovery[type]);
	const updates = [];
	updates.push(actor.modifyTokenAttribute(`resources.${type}`, amountRecovered, true));
	updates.push(
		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor }),
			flavor: game.i18n.localize(flavor[type]),
			content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-recovery.hbs', {
				message: messages[type],
				actor: actor.name,
				amount: amountRecovered,
				from: source,
			}),
		}),
	);
	return Promise.all(updates);
}

export const InlineRecovery = {
	enricher: inlineRecoveryEnricher,
	activateListeners,
	onDropActor,
};
