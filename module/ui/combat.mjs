import { SETTINGS } from '../settings.js';
import { Flags } from '../helpers/flags.mjs';
import { MESSAGES, SOCKET } from '../socket.mjs';
import { CombatHUD } from './combat-hud.mjs';
import { SYSTEM } from '../helpers/config.mjs';

export const FRIENDLY = 'friendly';

export const HOSTILE = 'hostile';

/**
 * @param {string} combatId
 * @param {string} combatantId
 */
export async function onMarkTurnTaken(combatId, combatantId) {
	const combat = game.combats.get(combatId);
	if (combat) {
		const combatant = combat.combatants.get(combatantId);
		if (combatant) {
			await combat.markTurnTaken(combatant);
		}
	}
}

export async function onTurnChanged() {
	CombatHUD.turnChanged();
}

export async function onRoundChanged() {
	CombatHUD.roundChanged();
}

/**
 * @property {Collection<FUCombatant>} combatants
 */
export class FUCombat extends Combat {
	get nextCombatant() {
		return null;
	}

	get combatant() {
		return null;
	}

	async rollInitiative(ids, options) {
		return this;
	}

	/**
	 * @param {CombatData} data
	 * @param context
	 */
	constructor(data, context) {
		super(data, context);

		if (this.isActive && game.settings.get(SYSTEM, SETTINGS.experimentalCombatHud)) CombatHUD.init();
	}

	/**
	 * @return {string[]}
	 */
	get currentRoundTurnsTaken() {
		const allRoundsTurnsTaken = this.getTurnsTaken();
		return allRoundsTurnsTaken[this.round] ?? [];
	}

	/**
	 * @return {Object<number, string[]>}
	 */
	getTurnsTaken() {
		return this.getFlag(SYSTEM, Flags.CombatantsTurnTaken) ?? {};
	}

	/**
	 * @param {Object<number,string[]>} flag
	 */
	async setTurnsTaken(flag) {
		console.log('setTurnsTaken', flag);
		return this.setFlag(SYSTEM, Flags.CombatantsTurnTaken, flag);
	}

	get totalTurns() {
		return this.combatants.reduce((sum, combatant) => sum + combatant.totalTurns, 0);
	}

	async _manageTurnEvents(adjustedTurn) {
		if (!game.users.activeGM?.isSelf) return;

		let prior = undefined;
		if (this.previous) {
			prior = this.combatants.get(this.previous.combatantId);
		}

		// Adjust the turn order before proceeding. Used for embedded document workflows
		if (Number.isNumeric(adjustedTurn)) await this.update({ turn: adjustedTurn }, { turnEvents: false });
		if (!this.started) return;

		// Identify what progressed
		const advanceRound = this.current.round > (this.previous.round ?? -1);
		const advanceTurn = this.current.turn > (this.previous.turn ?? -1);
		if (!(advanceTurn || advanceRound)) return;

		// Conclude prior turn
		if (prior) await this._onEndTurn(prior);

		// Conclude prior round
		if (advanceRound && this.previous.round !== null) await this._onEndRound();

		// Begin new round
		if (advanceRound) await this._onStartRound();

		// Begin a new turn
		await this._onStartTurn(this.combatant);
	}

	/**
	 * @param {FUCombatant} combatant
	 */
	async markTurnTaken(combatant) {
		if (game.user?.isGM) {
			this.current.combatantId = combatant?.id || null;
			this.current.tokenId = combatant?.tokenId || null;

			const flag = this.getTurnsTaken();
			flag[this.round] ??= [];
			flag[this.round].push(combatant.id);
			await this.setTurnsTaken(flag);

			this.setupTurns();

			await this.nextTurn();
		} else {
			await SOCKET.executeAsGM(MESSAGES.MarkTurnTaken, this.id, combatant.id);
		}
	}

	determineNextTurn() {
		if (!this.started) {
			return undefined;
		}

		const turnsTaken = this.currentRoundTurnsTaken;

		if (turnsTaken.length) {
			const lastTurn = this.combatants.get(turnsTaken.at(-1)).faction;

			const nextTurn = lastTurn === HOSTILE ? FRIENDLY : HOSTILE;
			let turnsNotTaken = this.currentRoundTurnsLeft;

			const skip = this.settings.skipDefeated;
			if (skip) {
				turnsNotTaken = turnsNotTaken.filter((combatant) => !combatant.isDefeated);
			}

			const factionsWithTurnsLeft = turnsNotTaken.map((combatant) => combatant.faction);

			return factionsWithTurnsLeft.includes(nextTurn) ? nextTurn : lastTurn;
		} else {
			return this.getFirstTurn();
		}
	}

	/**
	 * @return {Array<FUCombatant>}
	 */
	get currentRoundTurnsLeft() {
		const countTurnsTaken = this.currentRoundTurnsTaken.reduce((agg, currentValue) => {
			agg[currentValue] = (agg[currentValue] ?? 0) + 1;
			return agg;
		}, {});

		return this.combatants.filter((combatant) => (countTurnsTaken[combatant.id] ?? 0) < combatant.totalTurns);
	}

	/**
	 * @return {"hostile" | "friendly"}
	 */
	getCurrentTurn() {
		return this.getFlag(SYSTEM, Flags.CurrentTurn);
	}

	/**
	 * @param {"hostile" | "friendly"} flag
	 */
	setCurrentTurn(flag) {
		if (game.user === game.users.activeGM) {
			if (flag) {
				return this.setFlag(SYSTEM, Flags.CurrentTurn, flag);
			} else {
				return this.unsetFlag(SYSTEM, Flags.CurrentTurn);
			}
		}
	}

	_onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
		super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
	}

	setupTurns() {
		this.previous ??= {};
		return (this.turns = this.combatants.contents);
	}

	async startCombat() {
		const factions = [
			{
				value: FRIENDLY,
				translation: `FU.DialogFirstTurnFactionsFriendly`,
			},
			{
				value: HOSTILE,
				translation: `FU.DialogFirstTurnFactionsHostile`,
			},
		];

		const firstTurnFaction = await Dialog.prompt({
			title: game.i18n.localize('FU.DialogFirstTurnTitle'),
			label: game.i18n.localize('FU.DialogFirstTurnLabel'),
			content: await renderTemplate('systems/projectfu/templates/dialog/dialog_first_turn.hbs', {
				factions,
				selected: FRIENDLY,
			}),
			options: { classes: ['dialog-first-turn'] },
			rejectClose: false,
			/** @type {(jQuery) => "friendly"|"hostile"} */
			callback: (html) => html.find('select[name=faction]').val(),
		});

		if (!firstTurnFaction) {
			return this;
		}

		await this.setFirstTurn(firstTurnFaction);
		await this.setCurrentTurn(firstTurnFaction);
		return super.startCombat();
	}

	/**
	 * @return {"hostile" | "friendly"}
	 */
	getFirstTurn() {
		return this.getFlag(SYSTEM, Flags.FirstTurn);
	}

	/**
	 * @param {"hostile" | "friendly"} flag
	 */
	async setFirstTurn(flag) {
		return this.setFlag(SYSTEM, Flags.FirstTurn, flag);
	}

	async previousTurn() {
		const turnsTaken = this.getTurnsTaken();

		if (turnsTaken[this.round]) {
			turnsTaken[this.round].pop();
			await this.setTurnsTaken(turnsTaken);
		}

		await super.previousTurn();
		await this.setCurrentTurn(this.determineNextTurn());
		return this;
	}

	async previousRound() {
		const flag = this.getTurnsTaken();

		if (flag[this.round]) {
			delete flag[this.round];
		}
		flag[this.round - 1]?.pop();
		await this.setTurnsTaken(flag);

		await this.setCurrentTurn(this.determineNextTurn());
		await super.previousRound();

		if (!this.started) {
			await this.setCurrentTurn(undefined);
		}
		return this;
	}

	async nextTurn() {
		await this.setCurrentTurn(this.determineNextTurn());

		// Determine the next turn number

		const turnsTaken = this.currentRoundTurnsTaken.map((id) => this.combatants.get(id));
		let turnsNotTaken = this.currentRoundTurnsLeft;

		const skip = this.settings.skipDefeated;
		if (skip) {
			turnsNotTaken = turnsNotTaken.filter((combatant) => !combatant.isDefeated);
		}

		const next = turnsNotTaken.length ? turnsTaken.length : null;

		// Maybe advance to the next round
		let round = this.round;
		if (this.round === 0 || next === null) {
			return this.nextRound();
		}

		// Update the document, passing data through a hook first
		const updateData = { round, turn: next };
		const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
		Hooks.callAll('combatTurn', this, updateData, updateOptions);
		SOCKET.executeForOthers(MESSAGES.TurnChanged);
		return this.update(updateData, updateOptions);
	}

	async nextRound() {
		await this.setCurrentTurn(this.getFirstTurn());

		let turn = this.turn === null ? null : 0; // Preserve the fact that it's no-one's turn currently.
		let advanceTime = Math.max(this.totalTurns - this.turn, 0) * CONFIG.time.turnTime;
		advanceTime += CONFIG.time.roundTime;
		let nextRound = this.round + 1;

		// Update the document, passing data through a hook first
		const updateData = { round: nextRound, turn };
		const updateOptions = { advanceTime, direction: 1 };
		Hooks.callAll('combatRound', this, updateData, updateOptions);
		SOCKET.executeForOthers(MESSAGES.RoundChanged);
		return this.update(updateData, updateOptions);
	}
}
