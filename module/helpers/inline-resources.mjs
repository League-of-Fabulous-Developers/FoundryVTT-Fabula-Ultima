import { FU, SYSTEM } from './config.mjs';
import { Flags } from './flags.mjs';
import { FUActor } from '../documents/actors/actor.mjs';
import { FUItem } from '../documents/items/item.mjs';
import { targetHandler } from './target-handler.mjs';

const INLINE_RECOVERY = 'InlineRecovery';
const INLINE_LOSS = 'InlineLoss';

const classInlineRecovery = 'inline-recovery';
const classInlineLoss = 'inline-loss';

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineRecoveryEnricher = {
	pattern: /@(?:HEAL|GAIN)\[\s*(\d+\+?)\s*(\w+)\s*\]/gi,
	enricher: recoveryEnricher,
};

/**
 * @type {TextEditorEnricherConfig}
 */
const inlineLossEnricher = {
	pattern: /@LOSS\[\s*(\d+)\s*(\w+)\s*\]/gi,
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

function createReplacementElement(amount, type, elementClass, uncapped) {
	if (type in FU.resources && typeof amount === 'number') {
		const anchor = document.createElement('a');
		anchor.dataset.type = type;
		anchor.dataset.amount = amount;
		// Used to enable over-healing
		if (uncapped === true) {
			anchor.dataset.uncapped = 'true';
		}
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
	let uncapped = false;
	// Detect and handle uncapped recovery
	if (text[1].match(/^\d+\+$/)) {
		uncapped = true;
		text[1] = text[1].slice(0, -1);
	}
	return createReplacementElement(parseInt(text[1]), text[2].toLowerCase(), classInlineRecovery, uncapped);
}

function lossEnricher(text, options) {
	return createReplacementElement(parseInt(text[1]), text[2].toLowerCase(), classInlineLoss, false);
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
		.on('click', async function () {
			const amount = Number(this.dataset.amount);
			const type = this.dataset.type;
			const uncapped = this.dataset.uncapped === 'true';
			const source = determineSource(document, this);
			let targets = await targetHandler();
			if (targets.length > 0) {
				if (this.classList.contains(classInlineRecovery)) {
					targets.forEach((actor) => applyRecovery(actor, type, amount, source || 'inline recovery', uncapped));
				} else if (this.classList.contains(classInlineLoss)) {
					targets.forEach((actor) => applyLoss(actor, type, amount, source || 'inline loss'));
				}
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
				uncapped: this.dataset.uncapped === 'true',
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

function onDropActor(actor, sheet, { type, recoveryType, amount, source, uncapped }) {
	amount = Number(amount);
	if (type === INLINE_RECOVERY && !Number.isNaN(amount)) {
		applyRecovery(actor, recoveryType, amount, source, uncapped);
		return false;
	} else if (type === INLINE_LOSS && !Number.isNaN(amount)) {
		applyLoss(actor, recoveryType, amount, source);
		return false;
	}
}

async function applyRecovery(actor, resource, amount, source, uncapped) {
	const amountRecovered = Math.max(0, amount + actor.system.bonuses.incomingRecovery[resource]);
	const attrKey = `resources.${resource}`;
	const attr = foundry.utils.getProperty(actor.system, attrKey);
	const uncappedRecoveryValue = amountRecovered + attr.value;
	const updates = [];
	if (uncapped === true && uncappedRecoveryValue > attr.max) {
		// Overheal recovery
		let newValue = Object.defineProperties({}, Object.getOwnPropertyDescriptors(attr)); // Clone attribute
		newValue.value = uncappedRecoveryValue;
		updates.push(actor.modifyTokenAttribute(attrKey, newValue, false, false));
	} else {
		// Normal recovery
		updates.push(actor.modifyTokenAttribute(attrKey, amountRecovered, true));
	}
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
