import { Flags } from '../helpers/flags.mjs';
import { Pipeline } from './pipeline.mjs';
import { getPrioritizedUserSelected } from '../helpers/target-handler.mjs';
import { FUPartySheetHelper } from '../sheets/actor-party-sheet.mjs';
import { MESSAGES, SOCKET } from '../socket.mjs';

const sellAction = 'inventorySell';
const lootAction = 'inventoryLoot';
const rechargeAction = 'inventoryRecharge';
const costPerIP = 10;

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
			currency: game.i18n.localize('FU.Zenit'),
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
		const party = await FUPartySheetHelper.getActiveModel();
		if (party) {
			targets = party.characterActors;
		}
	}

	// Prompt confirmation
	const zenit = actor.system.resources.zenit.value;
	if (zenit <= 0) {
		return;
	}
	console.debug(`Distributing ${zenit} zenit from ${actor.name} to ${targets.length} characters`);
	const targetString = targets.map((t) => t.name).join(', ');
	const share = Math.round(zenit / targets.length);

	new Dialog({
		title: 'Distribute Zenit',
		content: game.i18n.format('FU.ChatInventoryDistributeZenit', {
			actor: actor.name,
			zenit: zenit,
			share: share,
			targets: targetString,
			currency: game.i18n.localize('FU.Zenit'),
		}),
		buttons: [
			{
				label: 'Confirm',
				callback: async () => {
					await updateResources(actor, -zenit);

					for (const target of targets) {
						await updateResources(target, share);
					}

					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor }),
						flags: Pipeline.initializedFlags(Flags.ChatMessage.Inventory, true),
						content: await renderTemplate('systems/projectfu/templates/chat/chat-distribute-zenit.hbs', {
							message: 'FU.ChatDistributeZenit',
							targets: targetString,
							zenit: zenit,
							currency: game.i18n.localize('FU.Zenit'),
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
			currency: game.i18n.localize('FU.Zenit'),
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
							currency: game.i18n.localize('FU.Zenit'),
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
 * @param {String} actorId
 * @param {String} itemId
 * @param {Boolean }sale
 * @returns {Promise<boolean|undefined>}
 */
async function dispatchTradeRequest(actorId, itemId, sale) {
	// Verify the item is still there
	const item = fromUuidSync(itemId);
	if (!item) {
		ui.notifications.warn('FU.ChatInventoryItemMissing', { localize: true });
		return;
	}

	// Select one target
	const targets = await getPrioritizedUserSelected();
	if (targets.length !== 1) {
		return false;
	}
	const target = targets[0];
	const targetId = target.uuid;

	// Now execute directly on GM or request as user
	if (game.user?.isGM) {
		return requestTrade(actorId, itemId, targetId, sale);
	} else {
		await SOCKET.executeAsGM(MESSAGES.RequestTrade, actorId, itemId, targetId, sale);
		return false;
	}
}

async function requestTrade(actorId, itemId, targetId, sale) {
	const actor = fromUuidSync(actorId);
	const item = fromUuidSync(itemId);
	const target = fromUuidSync(targetId);
	return handleTrade(actor, item, target, sale);
}

function validateFunds(target, cost) {
	const targetZenit = target.system.resources.zenit.value;
	if (targetZenit < cost) {
		ChatMessage.create({
			content: game.i18n.format('FU.ChatInventoryTransactionFailed', {
				actor: target.name,
				currency: game.i18n.localize('FU.Zenit'),
			}),
		});
		return false;
	}
	return true;
}

/**
 * @param {FUActor} actor
 * @param {FUItem} item
 * @param {FUActor} target
 * @param {Boolean} sale
 */
async function handleTrade(actor, item, target, sale) {
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

	// Don't delete consumables from the source
	if (item.type !== 'consumable') {
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
			currency: game.i18n.localize('FU.Zenit'),
			sale: sale,
			cost: cost,
		}),
	});
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

	Pipeline.handleClick(message, jQuery, sellAction, async (dataset) => {
		const actor = dataset.actor;
		const item = dataset.item;
		return dispatchTradeRequest(actor, item, true);
	});

	Pipeline.handleClick(message, jQuery, lootAction, async (dataset) => {
		const actor = dataset.actor;
		const item = dataset.item;
		return dispatchTradeRequest(actor, item, false);
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
	tradeItem,
	requestTrade,
	distributeZenit,
	requestRecharge,
};
