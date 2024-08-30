import { createChatMessage, promptCheck, promptOpenCheck } from './checks.mjs';
import { StudyRollHandler } from './study-roll.mjs';
import { toggleStatusEffect } from './effects.mjs';

export class ActionHandler {
	constructor(actor) {
		this.actor = actor;
	}

	async handleAction(actionType, isShift = false) {
		let action = '';

		switch (actionType) {
			case 'equipmentAction':
				action = 'equipment';
				if (!isShift) await this.createActionMessage(action);
				break;
			case 'guardAction':
				action = 'guard';
				if (!isShift) await this.toggleGuardEffect(this.actor);
				break;
			case 'hinderAction':
				action = 'hinder';
				if (!isShift) {
					await this.promptHinderCheck();
					this.createActionMessage(action);
				}
				break;
			case 'inventoryAction':
				action = 'inventory';
				if (!isShift) await this.createActionMessage(action);
				break;
			case 'objectiveAction':
				action = 'objective';
				if (!isShift) await this.createActionMessage(action);
				break;
			case 'spellAction':
				action = 'spell';
				if (!isShift) await this.createActionMessage(action);
				break;
			case 'studyAction':
				action = 'study';
				if (!isShift) await this.handleStudyAction();
				break;
			case 'skillAction':
				action = 'skill';
				if (!isShift) await this.createActionMessage(action);
				break;
			default:
				action = 'default';
				break;
		}

		if (action !== 'default' && isShift) {
			await this.createActionMessage(action);
		}
	}

	/**
	 * Handle the study action for the actor.
	 */
	async handleStudyAction() {
		const action = 'study';
		const { rollResult } = await promptOpenCheck(this.actor, 'FU.StudyRoll', action);
		const studyRollHandler = new StudyRollHandler(this.actor, rollResult);
		await studyRollHandler.handleStudyRoll();
		// TODO: Create Chat Message Button Study Target & Pass rollResult to handleStudyTarget
	}

	/**
	 * Create a chat message for a given action.
	 * @param {string} action - The type of action to create a message for.
	 */
	async createActionMessage(action) {
		const actionName = game.i18n.localize(CONFIG.FU.actionTypes[action] || action);
		const actionRule = game.i18n.localize(CONFIG.FU.actionRule[action] || action);

		const params = {
			details: {
				name: actionName,
			},
			description: actionRule,
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
		};
		// Call the createChatMessage function and await its completion
		await createChatMessage(params);
	}

	/**
	 * Toggle the guard effect on the actor.
	 * @param {Object} actor - The actor on which to toggle the guard effect.
	 */
	async toggleGuardEffect(actor) {
		if (!actor || !actor.effects) {
			console.error('Actor or actor.effects is undefined.');
			ui.notifications.error('Unable to toggle Guard: Actor is not properly initialized.');
			return;
		}

		const GUARD_EFFECT_ID = 'guard';
		const guardActive = await toggleStatusEffect(actor, GUARD_EFFECT_ID);
		if (!guardActive) {
			// Delete existing guard effects
			ui.notifications.info('Guard is deactivated.');
		} else {
			// Create a new guard effect
			ui.notifications.info('Guard is activated.');
			await this.createActionMessage('guard');
		}
	}

	/**
	 * Prompt a hinder check for the actor.
	 */
	async promptHinderCheck() {
		await promptCheck(this.actor, 'FU.Hinder');
	}
}
