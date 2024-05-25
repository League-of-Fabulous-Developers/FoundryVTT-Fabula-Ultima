import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';

const INLINE_RECOVERY = 'InlineRecovery';
const INLINE_LOSS = 'InlineLoss';

const classInlineRecovery = 'inline-recovery';
const classInlineLoss = 'inline-loss';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineRecoveryEnricher = {
	pattern: /@HEAL\[(\d+) (\w+?)]|@GAIN\[(\d+) (\w+?)]/g,
	enricher: recoveryEnricher,
};

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineLossEnricher = {
	pattern: /@LOSS\[(\d+) (\w+?)]/g,
	enricher: lossEnricher,
};

const recoveryFlavor = {
	hp: 'FU.HealthPointRecovery',
	mp: 'FU.MindPointRecovery',
	ip: 'FU.InventoryPointRecovery',
};

const lossFlavor = {
	hp: 'FU.HealthPointLoss',
	mp: 'FU.MindPointLoss',
	ip: 'FU.InventoryPointLoss',
};

const messages = {
	hp: 'FU.HealthPointRecoveryMessage',
	mp: 'FU.MindPointRecoveryMessage',
	ip: 'FU.InventoryPointRecoveryMessage',
};

function createReplacementElement(text, elementClass) {
	const amount = Number(text[1] ?? text[3]);
	const type = text[2] ?? text[4];

	if (type in FU.resources && typeof amount === 'number') {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.dataset.amount = amount;
		anchor.draggable = true;
		anchor.classList.add('inline', elementClass);

		const indicator = document.createElement('i');
		indicator.classList.add('indicator');
		anchor.append(indicator);

		anchor.append(`${amount} ${game.i18n.localize(FU.resourcesAbbr[type])}`);

		const icon = document.createElement('i');
		icon.className = FU.resourceIcons[type];
		icon.classList.add(type);
		anchor.append(icon);

		return anchor;
	} else {
		return null;
	}
}

function recoveryEnricher(text, options) {
	return createReplacementElement(text, classInlineRecovery);
}

function lossEnricher(text, options) {
	return createReplacementElement(text, classInlineLoss);
}

/**
 * @param {ClientDocument} document
 * @param {HTMLElement} element
 * @returns {string}
 */
function determineSource(document, element) {
	let source = game.i18n.localize('FU.UnknownRecoverySource');
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

	html.find('a.inline.inline-recovery[draggable], a.inline.inline-loss[draggable]')
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
				if (this.classList.contains(classInlineRecovery)) {
					actors.forEach((actor) => applyRecovery(actor, type, amount, source || 'inline recovery'));
				} else if (this.classList.contains(classInlineLoss)) {
					actors.forEach((actor) => applyLoss(actor, type, amount, source || 'inline loss'));
				}
			} else {
				ui.notifications.warn('FU.ChatApplyEffectNoActorsSelected', { localize: true });
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
				type: this.classList.contains(classInlineRecovery) ? INLINE_RECOVERY : INLINE_LOSS,
				source: source,
				recoveryType: this.dataset.type,
				amount: this.dataset.amount,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

function onDropActor(actor, sheet, { type, recoveryType, amount, source }) {
	amount = Number(amount);
	if (type === INLINE_RECOVERY && !Number.isNaN(amount)) {
		applyRecovery(actor, recoveryType, amount, source);
		return false;
	} else if (type === INLINE_LOSS && !Number.isNaN(amount)) {
		applyLoss(actor, recoveryType, amount, source);
		return false;
	}
}

async function applyRecovery(actor, resource, amount, source) {
	const amountRecovered = Math.max(0, amount + actor.system.bonuses.recovery[resource]);
	const updates = [];
	updates.push(actor.modifyTokenAttribute(`resources.${resource}`, amountRecovered, true));
	updates.push(
		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor }),
			flavor: game.i18n.localize(recoveryFlavor[resource]),
			content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-recovery.hbs', {
				message: messages[resource],
				actor: actor.name,
				amount: amountRecovered,
				from: source,
			}),
		}),
	);
	return Promise.all(updates);
}

async function applyLoss(actor, resource, amount, source) {
	const amountLost = -amount;
	const updates = [];
	updates.push(actor.modifyTokenAttribute(`resources.${resource}`, amountLost, true));
	updates.push(
		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor }),
			flavor: game.i18n.localize(lossFlavor[resource]),
			content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-loss.hbs', {
				message: 'FU.ChatResourceLoss',
				actor: actor.name,
				amount: amount,
				resource: game.i18n.localize(FU.resources[resource]),
				from: source,
			}),
		}),
	);
	return Promise.all(updates);
}

export const InlineResources = {
	enrichers: [inlineRecoveryEnricher, inlineLossEnricher],
	activateListeners,
	onDropActor,
};
