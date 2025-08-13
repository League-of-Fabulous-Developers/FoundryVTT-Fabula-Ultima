import { toggleStatusEffect } from '../pipelines/effects.mjs';
import { InlineSourceInfo } from './inline-helper.mjs';
import { FU } from './config.mjs';
import { TextEditor } from './text-editor.mjs';
import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { Checks } from '../checks/checks.mjs';
import { CheckPrompt } from '../checks/check-prompt.mjs';
import { CheckHooks } from '../checks/check-hooks.mjs';
import { CHECK_FLAVOR } from '../checks/default-section-order.mjs';
import { CheckConfiguration } from '../checks/check-configuration.mjs';

const actionKey = 'ruleDefinedAction';

/**
 * @type {RenderCheckHook}
 */
const onRenderCheck = (sections, check, actor) => {
	const action = check.additionalData[actionKey];
	if (action) {
		const description = game.i18n.localize(FU.actionRule[action]);
		if (description) {
			sections.push(
				foundry.applications.handlebars
					.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-check.hbs', {
						title: FU.actionTypes[action],
					})
					.then((value) => ({
						content: value,
						order: CHECK_FLAVOR,
					})),
			);

			sections.push(
				TextEditor.enrichHTML(`<div class="chat-desc"><p>${description}</p></div>`).then((v) => ({
					content: v,
					order: -1050,
				})),
			);
		}

		if (action === 'study') {
			const studyRollHandler = new StudyRollHandler(actor, check, CheckConfiguration.inspect(check).getTargets());
			studyRollHandler.handleStudyRoll();
		}
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

export class ActionHandler {
	constructor(actor) {
		this.actor = actor;
	}

	async handleAction(actionType, isShift = false) {
		if (!isShift) {
			switch (actionType) {
				case 'equipment':
					return this.createActionMessage(actionType);
				case 'guard':
					return this.toggleGuardEffect(this.actor);
				case 'hinder':
					return this.promptHinderCheck();
				case 'inventory':
					return this.createActionMessage(actionType);
				case 'objective':
					return this.createActionMessage(actionType);
				case 'spell':
					return this.createActionMessage(actionType);
				case 'study':
					return this.handleStudyAction();
				case 'skill':
					return this.createActionMessage(actionType);
			}
		} else {
			await this.createActionMessage(actionType);
		}
	}

	/**
	 * Handle the study action for the actor.
	 */
	async handleStudyAction() {
		await CheckPrompt.openCheck(this.actor, {
			initialConfig: { primary: 'ins', secondary: 'ins' },
			checkCallback: (check) => {
				check.additionalData[actionKey] = 'study';
			},
		});
	}

	/**
	 * Prompt a hinder check for the actor.
	 */
	async promptHinderCheck() {
		await CheckPrompt.attributeCheck(this.actor, {
			checkCallback: (check) => {
				check.additionalData[actionKey] = 'hinder';
			},
			initialConfig: {
				difficulty: 10,
				modifier: 0,
			},
		});
	}

	/**
	 * Create a chat message for a given action.
	 * @param {string} action - The type of action to create a message for.
	 */
	async createActionMessage(action) {
		return Checks.display(this.actor, null, (check) => {
			check.additionalData[actionKey] = action;
		});
	}

	/**
	 * Toggle the guard effect on the actor.
	 * @param {FUActor} actor - The actor on which to toggle the guard effect.
	 */
	async toggleGuardEffect(actor) {
		if (!actor || !actor.effects) {
			console.error('Actor or actor.effects is undefined.');
			ui.notifications.error('Unable to toggle Guard: Actor is not properly initialized.');
			return;
		}

		const GUARD_EFFECT_ID = 'guard';
		const guardActive = await toggleStatusEffect(actor, GUARD_EFFECT_ID, InlineSourceInfo.fromInstance(this));
		if (!guardActive) {
			// Delete existing guard effects
			ui.notifications.info('Guard is deactivated.');
		} else {
			// Create a new guard effect
			ui.notifications.info('Guard is activated.');
			await this.createActionMessage('guard');
		}
	}
}
