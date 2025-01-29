import { SYSTEM } from './helpers/config.mjs';
import { CombatHUD } from './ui/combat-hud.mjs';

export const MESSAGES = Object.freeze({
	ShowBanner: 'use',
	TurnStarted: 'startTurn',
	TurnEnded: 'endTurn',
	TurnChanged: 'turnChanged',
	RoundChanged: 'roundChanged',
});

export let SOCKET;

export function onSocketLibReady() {
	/* globals socketlib */
	SOCKET = socketlib.registerSystem(SYSTEM);

	SOCKET.register(MESSAGES.ShowBanner, showBanner);
	SOCKET.register(MESSAGES.TurnStarted, OnTurnStarted);
	SOCKET.register(MESSAGES.TurnEnded, OnTurnEnded);
	SOCKET.register(MESSAGES.TurnChanged, onTurnChanged);
	SOCKET.register(MESSAGES.RoundChanged, onRoundChanged);
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
async function OnTurnStarted(combatId, combatantId) {
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
async function OnTurnEnded(combatId, combatantId) {
	/** @type FUCombat **/
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) {
			await combat.endTurn(combatant);
		}
	}
}

export async function onTurnChanged() {
	CombatHUD.turnChanged();
}

export async function onRoundChanged() {
	CombatHUD.roundChanged();
}
