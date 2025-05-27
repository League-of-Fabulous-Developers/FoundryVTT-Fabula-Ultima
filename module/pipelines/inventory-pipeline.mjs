import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from './pipeline.mjs';
import { getPrioritizedUserSelected } from '../helpers/target-handler.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { MESSAGES, SOCKET } from '../socket.mjs';
import { StringUtils } from '../helpers/string-utils.mjs';

const sellAction = 'inventorySell';
const lootAction = 'inventoryLoot';
const rechargeAction = 'inventoryRecharge';
const costPerIP = 10;

function getCurrencyLocalizationKey() {
	return game.settings.get('projectfu', 'optionRenameCurrency') || 'FU.Zenit';
}

/**
 * @returns {String}
 */
function getCurrencyString() {
	return game.i18n.localize(getCurrencyLocalizationKey());
}

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {Boolean }sale
 * @returns {Promise<void>}
 */
async function tradeItem(actor, item, sale) {
	if (!actor.isOwner) {
		return;
	}
	console.debug(`Prompting ${sale ? 'sale' : 'loot'} of ${item.name} from ${actor.name}`);
	let message;
	let actionLabel;
	let action;
	let cost = 0;

	if (sale) {
		message = 'FU.ChatInventorySellMessage';
		actionLabel = 'FU.ChatInventoryBuy';
		action = sellAction;
		cost = item.system.cost.value;
	} else {
		message = 'FU.ChatInventoryLootMessage';
		actionLabel = 'FU.ChatInventoryLoot';
		action = lootAction;
	}

	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
		content: await renderTemplate('systems/projectfu/templates/chat/chat-trade-item.hbs', {
			message: message,
			actorName: actor.name,
			actorId: actor.uuid,
			itemName: item.name,
			itemId: item.uuid,
			itemImg: item.img,
			itemDescription: item.system.description,
			currency: getCurrencyString(),
			sale: sale,
			cost: cost,
			action: action,
			actionLabel: actionLabel,
			tooltip: 'Boop',
		}),
	});
}

/**
 * @param {FUActor} actor
 * @param {FUActor[]} targets
 * @returns {Promise<void>}
 */
async function distributeZenit(actor, targets) {
	if (!actor.isOwner) {
		return;
	}
	if (!targets) {
		// Resolve using the party characters
		const party = await FUPartySheet.getActiveModel();
		if (party) {
			targets = await party.getCharacterActors();
		}
	}

	// Prompt confirmation
	const zenit = actor.system.resources.zenit.value;
	if (zenit <= 0) {
		return;
	}

	// If not enough currency
	const characterCount = targets.length;
	if (zenit < characterCount) {
		ui.notifications.error(StringUtils.localize('FU.DialogInventoryDistributeNotEnough', { currency: getCurrencyString() }));
		return;
	}

	// Start with one unit
	const base = 1;
	let remaining = zenit - characterCount;
	// Distribute remaining evenly
	const bonus = Math.floor(remaining / characterCount);
	const share = base + bonus;
	const remainder = remaining % characterCount;
	const distributed = zenit - remainder;

	console.debug(`Distributing ${zenit} zenit from ${actor.name} to ${characterCount} characters`);
	const targetString = targets.map((t) => t.name).join(', ');
	new Dialog({
		title: 'Distribute Zenit',
		content: game.i18n.format('FU.ChatInventoryDistributeZenit', {
			actor: actor.name,
			zenit: distributed,
			share: share,
			targets: targetString,
			currency: getCurrencyString(),
		}),
		buttons: [
			{
				label: 'Confirm',
				callback: async () => {
					await updateResources(actor, -distributed);

					for (const target of targets) {
						await updateResources(target, share);
					}

					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor }),
						flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
						content: await renderTemplate('systems/projectfu/templates/chat/chat-distribute-zenit.hbs', {
							message: 'FU.ChatDistributeZenit',
							targets: targetString,
							zenit: distributed,
							currency: getCurrencyString(),
						}),
					});
				},
			},
			{
				label: 'Cancel',
				callback: () => {},
			},
		],
	}).render(true);
}

async function updateResources(actor, zenitIncrement, ipIncrement) {
	let updates = {};

	if (zenitIncrement) {
		const current = actor.system.resources.zenit.value;
		const newValue = Math.max(0, current + zenitIncrement);
		updates['system.resources.zenit.value'] = newValue;
	}

	if (ipIncrement) {
		const current = actor.system.resources.ip.value;
		const max = actor.system.resources.ip?.max;
		const newValue = Math.max(0, Math.min(current + ipIncrement, max));
		updates['system.resources.ip.value'] = newValue;
	}

	actor.update(updates);
}

/**
 * @param {FUActor} actor
 * @returns {Promise<void>}
 */
async function requestRecharge(actor) {
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
		content: await renderTemplate('systems/projectfu/templates/chat/chat-recharge-ip.hbs', {
			actorName: actor.name,
			actorId: actor.uuid,
		}),
	});
}

// TODO: In order to use actor we will need another socket-go-round
/**
 * @param {FUActor} actor
 * @returns {Promise<void>}
 */
async function rechargeIP(actor) {
	const targets = await getPrioritizedUserSelected();
	if (targets.length !== 1) {
		return false;
	}
	const target = targets[0];
	const ipData = target.system.resources.ip;
	const missingIP = ipData.max - ipData.value;
	if (missingIP === 0) {
		return false;
	}

	const cost = missingIP * costPerIP;
	if (!validateFunds(target, cost)) {
		return false;
	}

	console.debug(`Recharging the IP of ${target.name}`);
	new Dialog({
		title: game.i18n.localize('FU.InventoryRechargeIP'),
		content: game.i18n.format('FU.ChatInventoryRechargePrompt', {
			cost: cost,
			ip: missingIP,
			currency: getCurrencyString(),
		}),
		buttons: [
			{
				label: 'Confirm',
				callback: async () => {
					//await updateZenit(actor, cost);
					await updateResources(target, -cost, missingIP);

					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ target }),
						flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
						content: game.i18n.format('FU.ChatInventoryRechargeCompleted', {
							target: target.name,
							ip: missingIP,
							currency: getCurrencyString(),
						}),
					});
				},
			},
			{
				label: 'Cancel',
				callback: () => {},
			},
		],
	}).render(true);
}

/**
 * @param {String} sourceActorId
 * @param {String} targetActorId
 * @param {Number} amount
 * @returns {Promise}
 */
async function requestZenitTransfer(sourceActorId, targetActorId, amount) {
	// Now execute directly on GM or request as user
	if (game.user?.isGM) {
		/** @type FUActor **/
		const sourceActor = fromUuidSync(sourceActorId);

		if (validateFunds(sourceActor, amount)) {
			/** @type FUActor **/
			const targetActor = fromUuidSync(targetActorId);

			await updateResources(sourceActor, -amount);
			await updateResources(targetActor, amount);

			ChatMessage.create({
				content: game.i18n.format('FU.ChatZenitTransfer', {
					source: sourceActor.name,
					target: targetActor.name,
					amount: amount,
					currency: getCurrencyString(),
				}),
			});
		}
	} else {
		await SOCKET.executeAsGM(MESSAGES.RequestZenitTransfer, sourceActorId, targetActorId, amount);
	}
}

/**
 * @param {FUActor} actor
 * @param {'deposit'|'withdraw'} mode
 * @returns {Promise<void>}
 */
async function promptPartyZenitTransfer(actor, mode) {
	console.debug(`Prompt party zenit ${mode} for actor: ${actor.name}`);
	const currency = getCurrencyString();
	let label;
	switch (mode) {
		case 'deposit':
			label = 'FU.InventoryDepositZenit';
			break;
		case 'withdraw':
			label = 'FU.InventoryWithdrawZenit';
			break;
	}

	new Dialog({
		title: game.i18n.format(label, { currency: currency }),
		content: `<form>
      <div class="form-group">        
        <label for="amount"">Amount</label>
		<input type="number" name="amount" value="0"/>
      </div>
    </form>`,
		buttons: [
			{
				label: 'Confirm',
				callback: async (html) => {
					const amountStr = html.find('[name="amount"]').val();
					if (!amountStr) {
						return;
					}

					const amount = Number(amountStr);
					const party = await FUPartySheet.getActive();
					if (party) {
						let source, target;
						switch (mode) {
							case 'deposit':
								source = actor;
								target = party;
								break;
							case 'withdraw':
								source = party;
								target = actor;
								break;
						}
						await requestZenitTransfer(source.uuid, target.uuid, amount);
					}
				},
			},
			{
				label: 'Cancel',
				callback: () => {},
			},
		],
	}).render(true);
}

/**
 * @param {String} actorId
 * @param {String} itemId
 * @param {Boolean} sale
 * @param {String} targetId
 * @returns {Promise<boolean|undefined>}
 */
async function requestTrade(actorId, itemId, sale, targetId = undefined, modifiers = {}) {
	// Verify the item is still there
	const item = fromUuidSync(itemId);
	if (!item) {
		ui.notifications.warn('FU.ChatInventoryItemMissing', { localize: true });
		return;
	}

	// If no target is specified
	if (!targetId) {
		const targets = await getPrioritizedUserSelected();
		if (targets.length !== 1) {
			return false;
		}
		const target = targets[0];
		targetId = target.uuid;
	}

	// Now execute directly on GM or request as user
	if (game.user?.isGM) {
		return handleTrade(actorId, itemId, sale, targetId, modifiers);
	} else {
		await SOCKET.executeAsGM(MESSAGES.RequestTrade, actorId, itemId, sale, targetId, modifiers);
		return false;
	}
}

async function handleTrade(actorId, itemId, sale, targetId, modifiers = {}) {
	const actor = fromUuidSync(actorId);
	const item = fromUuidSync(itemId);
	const target = fromUuidSync(targetId);
	return onHandleTrade(actor, item, sale, target, modifiers);
}

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {Boolean} sale
 * @param {FUActor} target
 */
async function onHandleTrade(actor, item, sale, target, modifiers = {}) {
	// Don't execute on self
	if (actor.uuid === target.uuid) {
		return false;
	}

	// If the item is gone from the actor
	if (item === null) {
		return false;
	}

	let cost = 0;
	if (sale) {
		console.debug(`${target.name} is buying ${item.name} from ${actor.name}`);
		cost = item.system.cost.value;
		if (!validateFunds(target, cost)) {
			return false;
		}
		// Remove zenit from buyer
		await updateResources(target, -cost);
		// Add zenit to seller
		await updateResources(actor, cost);
	} else {
		console.debug(`${target.name} is looting ${item.name} from ${actor.name}`);
	}

	// Transfer item
	await target.createEmbeddedDocuments('Item', [item.toObject()]);

	// Don't delete consumables from the source unless shift click
	if (item.type !== 'consumable' || (item.type === 'consumable' && modifiers?.shift)) {
		await item.delete();
	}
	let message = sale ? 'FU.ChatItemPurchased' : 'FU.ChatItemLooted';

	// Post message
	ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor }),
		flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
		content: await renderTemplate('systems/projectfu/templates/chat/chat-item-acquired.hbs', {
			message: message,
			actorName: actor.name,
			itemName: item.name,
			targetName: target.name,
			currency: getCurrencyString(),
			sale: sale,
			cost: cost,
		}),
	});
	return true;
}

function validateFunds(target, cost) {
	const targetZenit = target.system.resources.zenit.value;
	if (targetZenit < cost) {
		ChatMessage.create({
			content: game.i18n.format('FU.ChatInventoryTransactionFailed', {
				actor: target.name,
				currency: getCurrencyString(),
			}),
		});
		return false;
	}
	return true;
}

/**
 * @param {Document} message
 * @param {jQuery} jQuery
 */
async function onRenderChatMessage(message, jQuery) {
	if (!message.getFlag(Flags.Scope, Flags.ChatMessage.Inventory) && !message.getFlag(Flags.Scope, Flags.ChatMessage.ResourceGain)) {
		return;
	}

	const getModifiers = (ev) => ({
		shift: ev?.shiftKey ?? false,
		ctrl: ev?.ctrlKey ?? false,
		alt: ev?.altKey ?? false,
		meta: ev?.metaKey ?? false,
	});

	Pipeline.handleClick(message, jQuery, sellAction, async (dataset, ev) => {
		const actor = dataset.actor;
		const item = dataset.item;
		const modifiers = getModifiers(ev);
		return requestTrade(actor, item, true, modifiers);
	});

	Pipeline.handleClick(message, jQuery, lootAction, async (dataset, ev) => {
		const actor = dataset.actor;
		const item = dataset.item;
		const modifiers = getModifiers(ev);
		return requestTrade(actor, item, false, modifiers);
	});

	Pipeline.handleClick(message, jQuery, rechargeAction, async (dataset) => {
		const actor = fromUuidSync(dataset.actor);
		return rechargeIP(actor);
	});
}

/**
 * @description Initialize the pipeline's hooks
 */
function initialize() {
	Hooks.on('renderChatMessage', onRenderChatMessage);
}

export const InventoryPipeline = {
	initialize,
	requestTrade,
	tradeItem,
	requestZenitTransfer,
	promptPartyZenitTransfer,
	distributeZenit,
	requestRecharge,
};
