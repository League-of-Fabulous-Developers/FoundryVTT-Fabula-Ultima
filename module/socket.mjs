/**
 * FUSocketHandler
 *
 * This handler encapsulates emitting and receiving socket messages through Foundry's
 * internal socket.io functions.  It provides several helper functions to more easily
 * facilitate this functionality being consumed by external classes.
 *
 * In general, these functions will avoid emitting socket messages to update documents
 * that require particular permissions (such as having a non-GM user update the active
 * combat to start/end their turn), since we can slightly reduce network traffic that
 * way AND Foundry's socket emit function will not emit the message to the current
 * client anyway.
 *
 * Community wiki article on sockets: https://foundryvtt.wiki/en/development/api/sockets
 * Foundry API doc: https://foundryvtt.com/api/classes/foundry.Game.html#socket
 */

import { SYSTEM } from './helpers/config.mjs';
import { getCurrencyString, InventoryPipeline } from './pipelines/inventory-pipeline.mjs';
import { FUHooks } from './hooks.mjs';
import { StudyRollHandler } from './pipelines/study-roll.mjs';

/**
 * @readonly
 * @enum {string}
 */
export const MESSAGES = Object.freeze({
	ShowBanner: 'showBanner',
	RequestStartTurn: 'requestStartTurn',
	RequestEndTurn: 'requestEndTurn',
	RequestTrade: 'requestTrade',
	RequestZenitTransfer: 'requestZenitTransfer',
	StudyEvent: 'studyEvent',
});

/**
 * Base format of a socket message
 * @typedef {Object} SocketMessage
 * @property {string} id - Unique identifier for the message
 * @property {string} name - Message handler name
 * @property {number} timestamp - Timestamp of when the message was sent
 * @property {string} sender - ID of the user that originated this message
 * @property {string[]} users - List of user IDs that should parse this message
 * @property {any[]} args - List of arguments to pass to handler function
 */

/**
 * @typedef {Object} SocketHandler
 * @property {string} messageType
 * @property {Function} handler
 */

export class FUSocketHandler {
	/**
	 * MUST be 'system.[systemname]'
	 * @type {String}
	 */

	identifier = `system.${SYSTEM}`;

	/** @type {Map<string, Function>} */
	messageHandlers = new Map();

	constructor() {
		this.registerSocketHandlers();
	}

	/**
	 * Registers a message handler
	 * @param {*} message
	 * @param {*} handler
	 */
	register(message, handler) {
		if (!(handler instanceof Function)) return;
		if (!this.messageHandlers.has(message)) this.messageHandlers.set(message, handler);
	}

	/**
	 * Execute a handler function as a specific user
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param {string} userId - ID of the user
	 * @param  {...any} args - Arguments to pass to handler function
	 * @returns
	 */
	async executeAsUser(name, userId, ...args) {
		return this.executeForUsers(name, [userId], ...args);
	}

	/**
	 *
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param {string[]} users - List of user IDs to execute the handler
	 * @param  {...any} args - Arguments to pass to handler
	 */
	async executeForUsers(name, users, ...args) {
		const handler = this.messageHandlers.get(name);
		if (!handler) return;

		const message = Object.freeze({
			...getBaseMessage(),
			name,
			users,
			args,
		});

		Hooks.callAll(FUHooks.SOCKET_SEND_EVENT, message);
		if (users.includes(game.user.id)) handler.apply(undefined, args);
		await game.socket.emit(this.identifier, message);
	}

	/**
	 * Executes a handler function for every connected user.
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param  {...any} args - Arguments to pass to handler
	 */
	async executeForEveryone(name, ...args) {
		const handler = this.messageHandlers.get(name);
		if (!handler) return;

		const message = Object.freeze({
			...getBaseMessage(),
			name,
			users: game.users.reduce((prev, curr) => {
				// Add all currently active users
				if (curr.active) return [...prev, curr.id];
				else return prev;
			}, []),
			args,
		});

		Hooks.callAll(FUHooks.SOCKET_SEND_EVENT, message);

		handler.apply(undefined, args);
		await game.socket.emit(this.identifier, message);
	}

	/**
	 * Execute a handler function as the first available GM user
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param  {...any} args - Arguments to pass to handler
	 * @returns
	 */
	async executeAsGM(name, ...args) {
		const handler = this.messageHandlers.get(name);
		if (!handler) return;

		if (game.user.isGM) {
			handler.apply(undefined, args);
		} else {
			if (game.user.activeGM) {
				const message = Object.freeze({
					...getBaseMessage(),
					users: [game.user.activeGM.id],
					name,
					args,
				});
				Hooks.callAll(FUHooks.SOCKET_SEND_EVENT, message);
				await game.socket.emit(this.identifier, message);
			}
		}
	}

	registerSocketHandlers() {
		this.register(MESSAGES.ShowBanner, showBanner);
		this.register(MESSAGES.RequestStartTurn, requestStartTurn);
		this.register(MESSAGES.RequestEndTurn, requestEndTurn);
		this.register(MESSAGES.RequestZenitTransfer, InventoryPipeline.requestZenitTransfer);
		this.register(MESSAGES.RequestTrade, InventoryPipeline.requestTrade);
		this.register(MESSAGES.StudyEvent, StudyRollHandler.onStudyEvent);

		game.socket.on(this.identifier, (message) => {
			// If this message is intended for only specific recipients and that is not us, do not process any further.
			if (Array.isArray(message.users) && !message.users.includes(game.user.id)) return;

			console.log('Socket message received:', message);
			Hooks.callAll(FUHooks.SOCKET_RECEIVE_EVENT, message);

			const handler = this.messageHandlers.get(message.name);
			if (handler instanceof Function) handler.apply(undefined, message.args);
		});
	}

	/**
	 * Show a banner at the top of the screen when an item is used
	 * @param {string} text
	 */
	async showBanner(text) {
		await this.executeForEveryone(MESSAGES.ShowBanner, text);
	}

	/**
	 * Requests to begin the turn for a given combatant.
	 * @param {string} combatId
	 * @param {string} combatantId
	 */
	async requestStartTurn(combatId, combatantId) {
		try {
			if (!game.user.activeGM) throw new Error(game.i18n.localize('FU.RequestStartTurnNoActiveGM'));
			await this.executeAsGM(MESSAGES.RequestStartTurn, combatId, combatantId);
		} catch (err) {
			ui.notifications.error(err.message, { localize: true });
		}
	}

	/**
	 * Requests to end the turn for a given combatant
	 * @param {string} combatId
	 * @param {string} combatantId
	 */
	async requestEndTurn(combatId, combatantId) {
		try {
			if (!game.user.activeGM) throw new Error(game.i18n.localize('FU.RequestEndTurnNoActiveGM'));
			await this.executeAsGM(MESSAGES.RequestEndTurn, combatId, combatantId);
		} catch (err) {
			ui.notifications.error(err.message, { localize: true });
		}
	}

	/**
	 *
	 * @param {string} sourceActorId
	 * @param {string} targetActorId
	 * @param {number} amount
	 */
	async requestZenitTransfer(sourceActorId, targetActorId, amount) {
		try {
			if (!game.users.activeGM) throw new Error(game.i18n.format('FU.RequestZenitTransferNoActiveGM', { currency: getCurrencyString() }));
			await this.executeAsGM(MESSAGES.RequestZenitTransfer, sourceActorId, targetActorId, amount);
		} catch (err) {
			ui.notifications.error(err.message, { localize: true });
		}
	}

	/**
	 * @param {String} actorId
	 * @param {String} itemId
	 * @param {Boolean} sale
	 * @param {String} targetId
	 * @returns {Promise<boolean|undefined>}
	 */
	async requestTrade(actorId, itemId, sale, targetId = undefined, modifiers = {}) {
		try {
			if (!game.users.activeGM) throw new Error(game.i18n.localize('FU.RequestTradeNoActiveGM'));
			await this.executeAsGM(MESSAGES.RequestTrade, actorId, itemId, sale, targetId, modifiers);
		} catch (err) {
			ui.notifications.error(err.message, { localize: true });
		}
	}

	/**
	 * @param {{actorUuid : String, targetUuids: String[], checkResult: Number}} data
	 */
	async studyRoll(data) {
		await this.executeAsGM(MESSAGES.StudyEvent, data);
	}
}

/**
 * Shows a banner on the screen when an item is rolled
 * @param {string} text - Text to show
 *
 */
function showBanner(text) {
	text = `${text}`;
	ui.notifications.notify(text, 'projectfu-spellname', {
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
}
/**
 *
 * @param {string} combatId
 * @param {string} combatantId
 */
async function requestStartTurn(combatId, combatantId) {
	/** @type FUCombat */
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) await combat.startTurn(combatant);
	}
}

/**
 *
 * @param {string} combatId
 * @param {string} combatantId
 */
async function requestEndTurn(combatId, combatantId) {
	/** @type FUCombat */
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) await combat.endTurn(combatant);
	}
}

function getBaseMessage() {
	return {
		id: foundry.utils.randomID(),
		timestamp: Date.now(),
		sender: game.user?.id,
	};
}
