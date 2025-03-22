/**
 * @class
 * @property {FUCombat} viewed The currently tracked combat encounter
 * @property {Function<Promise<object>>} getData
 * @property {Function<Combatant, Boolean, void>} hoverCombatant
 * @remarks {@link https://foundryvtt.com/api/classes/client.CombatTracker.html}
 */
export class FUCombatTracker extends CombatTracker {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			template: 'systems/projectfu/templates/ui/combat-tracker.hbs',
			classes: [...super.defaultOptions.classes, 'projectfu'],
		});
	}

	/**
	 * @description The data context used by the rendering
	 * @param options
	 * @returns {Promise<*>}
	 */
	async getData(options = {}) {
		const data = await super.getData(options);
		/** @type FUCombat **/
		const combat = data.combat;
		if (combat) {
			combat.populateData(data);
			// We add more data to the turns objects
			data.turns = data.turns?.map((turn) => {
				turn.statusEffects = combat.combatants.get(turn.id)?.actor.temporaryEffects.map((effect) => ({
					name: effect.name,
					img: effect.img,
				}));
				turn.css = turn.css.replace('active', '');
				return turn;
			});
			data.factions = await this.getFactions(data.turns, combat);
			if (data.turns.size === 0) {
				console.error(`Found no available turns on combat ${combat}`);
			}
		}
		return data;
	}

	/**
	 * @param {jQuery} html
	 */
	activateListeners(html) {
		super.activateListeners(html);
		html.find('a[data-action=start-turn]').click((event) => this.handleStartTurn(event));
		html.find('a[data-action=end-turn]').click((event) => this.handleEndTurn(event));
		html.find('a[data-action=take-turn-out-of-turn]').click((event) => this.handleTakeTurnOutOfTurn(event));
		html.find('.combatant')
			.off('click')
			.on('click', (event) => this.customOnCombatantClick(event));
		html.find('.combatant-name').on('dblclick', (event) => this._onCombatantMouseDown(event));
	}

	/**
	 * Custom method for handling combatant click
	 * @param {Event} event
	 */
	customOnCombatantClick(event) {
		event.preventDefault();

		if (game.settings.get('projectfu', 'optionCombatMouseDown')) {
			// Call the custom function
			this._onCustomCombatantMouseDown(event);
		} else {
			this._onCombatantMouseDown(event);
		}
	}

	/**
	 * Handle custom combatant mouse down
	 * @param {Event} event
	 */
	async _onCustomCombatantMouseDown(event) {
		event.preventDefault();

		const li = event.currentTarget;
		const combatant = this.viewed.combatants.get(li.dataset.combatantId);
		const token = combatant.token;
		if (!combatant.actor?.testUserPermission(game.user, 'OBSERVER')) return;

		// Handle double-left click to open sheet
		const now = Date.now();
		const dt = now - this._clickTime;
		this._clickTime = now;
		if (dt <= 250) {
			return combatant.actor?.sheet.render(true);
		}

		// Control Token object (no panning)
		if (token?.object) {
			token.object?.control({ releaseOthers: true });
		}
	}

	/**
	 * @param turns
	 * @param {FUCombat} combat
	 * @return {Object.<"friendly"|"neutral"|"hostile", {}[]>}
	 */
	async getFactions(turns, combat) {
		return turns.reduce(
			(agg, combatantData) => {
				const combatant = combat.combatants.get(combatantData.id);
				// The tracker rendering needs this! Do not remove!
				combatantData.faction = combatant.faction;
				combatantData.isOwner = combatant.isOwner;
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

	async handleStartTurn(event) {
		const combatantId = $(event.currentTarget).parents('[data-combatant-id]').data('combatantId');
		const combatant = this.viewed.combatants.get(combatantId);
		if (combatant) {
			await this.viewed.startTurn(combatant);
		}
	}

	async handleEndTurn(event) {
		const combatantId = $(event.currentTarget).parents('[data-combatant-id]').data('combatantId');
		/** @type Combatant  */
		const combatant = this.viewed.combatants.get(combatantId);
		if (combatant) {
			if (combatant.isDefeated) {
				const takeTurn = await Dialog.confirm({
					title: game.i18n.localize('FU.DialogDefeatedTurnTitle'),
					content: game.i18n.localize('FU.DialogDefeatedTurnContent'),
				});

				if (!takeTurn) {
					return;
				}
			}
			await this.viewed.endTurn(combatant);
		}
	}

	async handleTakeTurnOutOfTurn(event) {
		if (event.shiftKey) {
			await this.handleStartTurn(event);
		} else {
			ui.notifications.info('FU.CombatTakeTurnOutOfTurn', { localize: true });
		}
	}
}
