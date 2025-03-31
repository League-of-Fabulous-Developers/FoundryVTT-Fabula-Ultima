import { SYSTEM } from './helpers/config.mjs';

export const MESSAGES = Object.freeze({
	ShowBanner: 'use',
	RequestStartTurn: 'requestStartTurn',
	RequestEndTurn: 'requestEndTurn',
});

export let SOCKET;

export function onSocketLibReady() {
	/* globals socketlib */
	SOCKET = socketlib.registerSystem(SYSTEM);

	SOCKET.register(MESSAGES.ShowBanner, showBanner);
	SOCKET.register(MESSAGES.RequestStartTurn, requestStartTurn);
	SOCKET.register(MESSAGES.RequestEndTurn, requestEndTurn);
}

function showBanner(text) {
	text = `${text}`;
	ui.notifications.queue.push({
		message: text,
		type: 'projectfu-spellname',
		timestamp: new Date().getTime(),
		permanent: false,
		console: false,
	});
	if (ui.notifications.rendered) ui.notifications.fetch();
}

/**
 * @param {string} combatId
 * @param {string} combatantId
 */
async function requestStartTurn(combatId, combatantId) {
	/** @type FUCombat **/
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) {
			await combat.startTurn(combatant);
		}
	}
}

/**
 * @param {string} combatId
 * @param {string} combatantId
 */
async function requestEndTurn(combatId, combatantId) {
	/** @type FUCombat **/
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) {
			await combat.endTurn(combatant);
		}
	}
}
