import { FUCombat } from './combat.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { systemPath } from '../helpers/config.mjs';

/**
 * @class
 * @property {FUCombat} viewed The currently tracked combat encounter
 * @property {Function<Promise<object>>} getData
 * @property {Function<Combatant, Boolean, void>} hoverCombatant
 * @property {HTMLElement} element
 * @remarks {@link https://foundryvtt.com/api/classes/client.CombatTracker.html}
 */
export class FUCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
	/**
	 * @inheritDoc
	 * @type ApplicationConfiguration
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['projectfu'],
	};

	/** @inheritdoc */
	static PARTS = {
		/** Inherited */
		header: {
			template: systemPath('templates/ui/combat-tracker-header.hbs'),
		},
		/** Overridden, only used for "alternative" combat */
		tracker: {
			template: systemPath('templates/ui/combat-tracker.hbs'),
		},
		/** Inherited, only used for "alternative" combats */
		footer: {
			template: 'templates/sidebar/tabs/combat/footer.hbs',
		},
	};

	/** @inheritdoc */
	_configureRenderParts(options) {
		// deep clone of static PARTS
		const parts = super._configureRenderParts(options);
		//delete parts.footer;
		return parts;
	}

	/**
	 * Prepare render context for the tracker part.
	 * @param {ApplicationRenderContext} context
	 * @param {HandlebarsRenderOptions} options
	 * @returns {Promise<void>}
	 * @override
	 */
	async _prepareTrackerContext(context, options) {
		const combat = this.viewed;
		if (!combat) return;
		await super._prepareTrackerContext(context, options);

		combat.populateData(context);
		// We add more data to the turns objects
		context.turns = context.turns?.map((turn) => {
			turn.statusEffects = combat.combatants.get(turn.id)?.actor.temporaryEffects.map((effect) => ({
				name: effect.name,
				img: effect.img,
			}));
			turn.css = turn.css.replace('active', '');
			return turn;
		});
		context.factions = await this.getFactions(context.turns, combat);
		if (context.turns.size === 0) {
			console.error(`Found no available turns on combat ${combat}`);
		}
	}

	/**
	 * @inheritDoc
	 * @override
	 * */
	_attachFrameListeners() {
		super._attachFrameListeners();
		this.element.addEventListener('click', async (ev) => {
			const target = ev.target;
			if (target.closest('.start-turn')) {
				return this.handleStartTurn(ev);
			} else if (target.closest('.end-turn')) {
				return this.handleEndTurn(ev);
			} else if (target.closest('.take-turn.out-of-turn')) {
				return this.handleTakeTurnOutOfTurn(ev);
			}
		});
	}

	/**
	 * @param turns
	 * @param {FUCombat} combat
	 * @return {Object.<'friendly'|'neutral'|'hostile', {}[]>}
	 */
	async getFactions(turns, combat) {
		// TODO: This information is also required by the combat hud, but populated in an entirely different way!
		return turns.reduce(
			(agg, combatantData) => {
				const combatant = combat.combatants.get(combatantData.id);
				// Skip combatants that can't be found or don't have a token.
				if (!combatant?.token) return agg;
				// The tracker rendering needs this! Do not remove!
				combatantData.faction = combatant.faction;
				combatantData.isOwner = combatant.isOwner;

				if (!FUCombat.showTurnsFor(combatant)) {
					combatantData.hideTurns = true;
				}
				if (combatant.token.disposition === foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
					agg.friendly.push(combatantData);
				} else {
					agg.hostile.push(combatantData);
				}
				return agg;
			},
			{ friendly: [], hostile: [] },
		);
	}

	/**
	 * Handle performing some action for an individual combatant.
	 * @param {PointerEvent} event  The triggering event.
	 * @param {HTMLElement} target  The action target element.
	 * @override
	 */
	_onCombatantControl(event, target) {
		super._onCombatantControl(event, target);

		const { combatantId } = target.closest('[data-combatant-id]')?.dataset ?? {};
		const combatant = this.viewed?.combatants.get(combatantId);
		if (!combatant) return;

		// Switch control action
		switch (target.dataset.action) {
			case 'inspectCombatant': {
				const uuid = `Actor.${combatant.actorId}`;
				FUPartySheet.inspectAdversary(uuid);
				break;
			}
		}
	}

	#getCombatantFromEvent(event) {
		const parent = event.target.closest('[data-combatant-id]');
		if (!parent) return;

		const combatantId = parent.dataset.combatantId;
		return this.viewed.combatants.get(combatantId);
	}

	async handleStartTurn(event) {
		const combatant = this.#getCombatantFromEvent(event);
		if (combatant) {
			await this.viewed.startTurn(combatant);
		}
	}

	async handleEndTurn(event) {
		const combatant = this.#getCombatantFromEvent(event);
		if (!combatant) return;

		if (combatant.isDefeated) {
			const takeTurn = await foundry.applications.api.DialogV2.confirm({
				window: { title: game.i18n.localize('FU.DialogDefeatedTurnTitle') },
				content: game.i18n.localize('FU.DialogDefeatedTurnContent'),
			});
			if (!takeTurn) return;
		}

		await this.viewed.endTurn(combatant);
	}

	async handleTakeTurnOutOfTurn(event) {
		if (event.shiftKey) {
			await this.handleStartTurn(event);
		} else {
			ui.notifications.info('FU.CombatTakeTurnOutOfTurn', { localize: true });
		}
	}
}
