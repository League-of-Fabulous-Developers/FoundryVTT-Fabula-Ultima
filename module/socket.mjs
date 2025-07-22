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

export class FUSocketHandler {
	/**
	 * MUST be 'system.[systemname]'
	 * @type {String}
	 */

	identifier = `system.${SYSTEM}`;

	/** @type {Map<string, Function>} */
	#messageHandlers = new Map();

	constructor() {
		this.registerSocketHandlers();
	}

	/**
	 * Registers a message handler
	 * @param {string} message - Name of message handler to register
	 * @param {Function} handler - Function to be called when message received
	 */
	register(message, handler) {
		if (!(handler instanceof Function)) return;
		if (this.#messageHandlers.has(message)) throw new Error(game.i18n.format('FU.SocketHandlerAlreadyRegistered', { name: message }));
		else this.#messageHandlers.set(message, handler);
	}

	/**
	 * Unregisters a message handler
	 * @param {string} message - Name of message handler to unregister
	 * @returns {boolean} - True if a handler was registered, false otherwise
	 */
	unregister(message) {
		return this.#messageHandlers.delete(message);
	}

	/**
	 * Execute a handler function as a specific user
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param {string} userId - ID of the user
	 * @param  {...any} args - Arguments to pass to handler function
	 * @returns
	 */
	async executeAsUser(name, userId, ...args) {
		return this.sendMessage(name, [userId], args);
	}

	/**
	 *
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param {string[]} users - List of user IDs to execute the handler
	 * @param  {...any} args - Arguments to pass to handler
	 */
	async executeForUsers(name, users, ...args) {
		return this.sendMessage(name, users, args);
	}

	/**
	 * Executes a handler function for every connected user.
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param  {...any} args - Arguments to pass to handler
	 */
	async executeForEveryone(name, ...args) {
		return this.sendMessage(
			name,
			game.users.filter((user) => user.active).map((user) => user.id),
			args,
		);
	}

	/**
	 * Execute a handler function as the first available GM user
	 * @param {string} name - Name of the handler function.  Must be registered with {@link register}
	 * @param  {...any} args - Arguments to pass to handler
	 * @returns
	 */
	async executeAsGM(name, ...args) {
		if (game.users.activeGM) {
			return this.sendMessage(name, [game.users.activeGM.id], args);
		}
	}

	/**
	 * @param {string} name - Handler name
	 * @param {string[]} users - List of user IDs to process this message
	 * @param {any[]} args - List of arguments to pass to handler
	 * @returns
	 */
	async sendMessage(name, users, args) {
		const handler = this.#messageHandlers.get(name);
		if (!handler) return;

		const message = foundry.utils.deepFreeze({
			id: foundry.utils.randomID(),
			timestamp: Date.now(),
			sender: game.user?.id,
			name,
			users,
			args,
		});

		const confirmed = Hooks.call(FUHooks.SOCKET_SEND_EVENT, message);
		if (!confirmed) return;

		// If the message recipients includes the current user, call the handler directly
		// since game.socket.emit will not emit the message to the current client
		if (message.users.includes(game.user.id)) handler.apply(undefined, [...message.args, message]);

		// Only dispatch socket message if the message's recipients include someone other than the current user.
		if (message.users.some((user) => user.id !== game.user.id)) game.socket.emit(this.identifier, message);
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

			const handler = this.#messageHandlers.get(message.name);
			if (!(handler instanceof Function)) return;

			const frozen = foundry.utils.deepFreeze(message);

			handler.apply(undefined, [...frozen.args, frozen]);
			Hooks.callAll(FUHooks.SOCKET_RECEIVE_EVENT, frozen);
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
			if (!game.users.activeGM) throw new Error(game.i18n.localize('FU.RequestStartTurnNoActiveGM'));
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
			if (!game.users.activeGM) throw new Error(game.i18n.localize('FU.RequestEndTurnNoActiveGM'));
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
