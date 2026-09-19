import { FUCombat } from './combat.mjs';
import { FUPartySheet } from '../sheets/actor-party-sheet.mjs';
import { systemPath } from '../helpers/config.mjs';
import { Checks } from '../checks/checks.mjs';
import { GroupCheck } from '../checks/group-check.mjs';
import { MESSAGES } from '../socket.mjs';

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
		actions: {
			// Turn actions
			startTurn: FUCombatTracker.#onStartTurn,
			endTurn: FUCombatTracker.#onEndTurn,
			takeTurnOutOfTurn: FUCombatTracker.#onTakeTurnOutOfTurn,
			// Progress tracks
			addTrack: this.#onAddTrack,
			removeTrack: this.#onRemoveTrack,
			updateTrack: { handler: this.#onUpdateTrack, buttons: [0, 2] },
			promptTrack: this.#onPromptTrack,
			// Bulk rolls
			rollAll: FUCombatTracker.#onRollAll,
		},
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
			const combatant = combat.combatants.get(turn.id);
			if (combatant.actor) {
				turn.statusEffects = combatant?.actor.temporaryEffects.map((effect) => ({
					name: effect.name,
					img: effect.img,
				}));
			}
			turn.css = turn.css.replace('active', '');
			return turn;
		});
		context.factions = await this.getFactions(context.turns, combat);
		if (context.turns.size === 0) {
			console.error(`Found no available turns on combat ${combat}`);
		}
	}

	_onCombatantMouseDown(event, target) {
		if (event.type === 'dblclick' && event.target.closest('[data-action]')) {
			return;
		}
		return super._onCombatantMouseDown(event, target);
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

	/**
	 * @param {FUCombatant} combatant
	 * @return {Promise<void>}
	 */
	async handleStartTurn(combatant) {
		if (combatant && combatant.combat) {
			if (combatant.isDefeated) {
				const takeTurn = await foundry.applications.api.DialogV2.confirm({
					window: { title: game.i18n.localize('FU.DialogDefeatedTurnTitle') },
					content: game.i18n.localize('FU.DialogDefeatedTurnContent'),
				});
				if (!takeTurn) return;
			}

			await combatant.combat.startTurn(combatant);
		}
	}

	/**
	 * @param {FUCombatant} combatant
	 * @return {Promise<void>}
	 */
	async handleEndTurn(combatant) {
		if (combatant && combatant.combat) {
			await combatant.combat.endTurn(combatant);
		}
	}

	/**
	 * @param {FUCombatant} combatant
	 * @param {boolean} force
	 * @return {Promise<void>}
	 */
	async handleTakeTurnOutOfTurn(combatant, force = false) {
		if (force) {
			await this.handleStartTurn(combatant);
		} else {
			ui.notifications.info('FU.CombatTakeTurnOutOfTurn', { localize: true });
		}
	}

	static #onStartTurn(event, target) {
		const combatantId = target.closest('[data-combatant-id]')?.dataset?.combatantId;
		const combatant = this.viewed.combatants.get(combatantId);
		if (combatant) {
			return this.handleStartTurn(combatant);
		}
	}

	static #onEndTurn(event, target) {
		const combatantId = target.closest('[data-combatant-id]')?.dataset?.combatantId;
		const combatant = this.viewed.combatants.get(combatantId);
		if (combatant) {
			return this.handleEndTurn(combatant);
		}
	}

	static #onTakeTurnOutOfTurn(event, target) {
		const combatantId = target.closest('[data-combatant-id]')?.dataset?.combatantId;
		const combatant = this.viewed.combatants.get(combatantId);
		if (combatant) {
			return this.handleTakeTurnOutOfTurn(combatant, event.shiftKey);
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onAddTrack(event, target) {
		if (this.viewed) {
			return this.viewed.addTrack();
		}
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRemoveTrack(event, target) {
		const index = Number(target.closest('[data-index]').dataset.index);
		return this.viewed.removeTrack(index);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onUpdateTrack(event, target) {
		//const rightClick = event.which === 3 || event.button === 2;
		const { updateAmount, index, alternate } = target.dataset;
		let increment = parseInt(updateAmount);
		if (alternate && event.button === 2) {
			increment = -increment;
		}

		return this.viewed.updateTrack(parseInt(index), increment);
	}

	/**
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onPromptTrack(event, target) {
		const index = Number(target.closest('[data-index]').dataset.index);
		await this.viewed.promptTrack(index);
	}

	/**
	 * Prompt for a leader among the characters present in the encounter,
	 * then start the regular initiative group check flow with that leader.
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async #onRollAll(event, target) {
		const combat = this.viewed;
		if (!combat) return;

		const characters = combat.combatants
			.filter((combatant) => combatant.actor?.type === 'character')
			.map((combatant) => ({ value: combatant.actorId, label: combatant.name }))
			.filter((name, index, list) => list.findIndex((other) => other.value === name.value) === index);

		if (characters.length === 0) {
			ui.notifications.warn(game.i18n.localize('FU.DialogRollAllNoCharacter'));
			return;
		}

		const leaderId = await foundry.applications.api.DialogV2.prompt({
			window: {
				title: game.i18n.localize('FU.DialogRollAllLeaderTitle'),
			},
			content: await foundry.applications.handlebars.renderTemplate(systemPath(`templates/dialog/dialog-roll-all-leader.hbs`), {
				characters,
				selected: characters.at(0).value,
			}),
			rejectClose: false,
			ok: {
				label: game.i18n.localize('FU.DialogRollAllLabel'),
				callback: (event, button, dialog) => {
					const select = dialog.element.querySelector(`select[name="leader"]`);
					if (select instanceof HTMLSelectElement) return select.value;
					return undefined;
				},
			},
		});

		if (!leaderId) {
			console.warn(`No leader was selected for the initiative group check`);
			return;
		}

		const leader = game.actors.get(leaderId);
		if (!leader) {
			console.warn(`Could not find the leader actor ${leaderId} for the initiative group check`);
			return;
		}

		const owners = game.users.filter((user) => user.active && !user.isGM && leader.testUserPermission(user, 'OWNER'));
		// Prefer users who have the actor assigned as their character, as that is a definitive indicator of ownership.
		const assignedOwners = owners.filter((user) => user.character?.id === leader.id);
		if (assignedOwners.length === 1) {
			return game.projectfu.socket.executeForUsers(MESSAGES.RequestInitiativeRollAll, [assignedOwners.at(0).id], leader.id);
		}

		// Either no owning player is connected, or the owner among several could not be determined — fall back to rolling the check here.
		if (owners.length === 0) {
			ui.notifications.warn(game.i18n.localize('FU.DialogRollAllNoOwnerWarning'));
		} else {
			ui.notifications.warn(game.i18n.localize('FU.DialogRollAllAmbiguousOwnerWarning'));
		}
		return FUCombatTracker.#startInitiativeGroupCheck(leader);
	}

	/**
	 * Starts an initiative group check for the actor with the given ID on the receiving client,
	 * so that the leader character's owning player performs the roll themselves.
	 * @param {string} actorId
	 */
	static onInitiativeRollAllRequest(actorId) {
		const actor = game.actors.get(actorId);
		if (!actor) return;
		return FUCombatTracker.#startInitiativeGroupCheck(actor);
	}

	/**
	 * Starts an initiative group check for the given actor.
	 * @param {Actor} actor The actor leading the group check
	 * @returns {Promise<void>}
	 */
	static #startInitiativeGroupCheck(actor) {
		return Checks.groupCheck(actor, GroupCheck.initInitiativeCheck);
	}
}
