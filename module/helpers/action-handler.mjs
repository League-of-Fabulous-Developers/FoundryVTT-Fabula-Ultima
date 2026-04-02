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
import { StringUtils } from './string-utils.mjs';
import { WeaponResolver } from '../documents/items/skill/weapon-resolver.mjs';
import FoundryUtils from './foundry-utils.mjs';
import { EquipmentHandlerDialog } from './equipment-handler.mjs';

const actionKey = 'ruleDefinedAction';

/**
 * @type {RenderCheckHook}
 */
const onRenderCheck = (data, check, actor) => {
	const action = check.additionalData[actionKey];
	if (action) {
		const description = game.i18n.localize(FU.actionRule[action]);
		if (description) {
			data.sections.push(
				foundry.applications.handlebars
					.renderTemplate('systems/projectfu/templates/chat/chat-check-flavor-check.hbs', {
						title: FU.actionTypes[action],
					})
					.then((value) => ({
						content: value,
						order: CHECK_FLAVOR,
					})),
			);

			data.sections.push(
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

/**
 * @desc Encapsulates basic character actions.
 * @property {FUActor} actor
 * @property {Number} bonus
 */
export class ActionHandler {
	constructor(actor) {
		this.actor = actor;
		this.bonus = 0;
	}

	/**
	 * @param {Number} bonus
	 */
	withBonus(bonus) {
		this.bonus = bonus;
		return this;
	}

	/**
	 *
	 * @param {FUActionType} actionType
	 * @param isShift
	 * @returns {Promise<void>}
	 */
	async handleAction(actionType, isShift = false) {
		if (!isShift) {
			switch (actionType) {
				case 'attack':
					return this.attack();
				case 'equipment':
					return this.equipment();
				case 'guard':
					return this.toggleGuardEffect(this.actor);
				case 'hinder':
					return this.promptHinderCheck();
				case 'inventory':
					return this.createActionMessage(actionType);
				case 'objective':
					return this.objective();
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
			initialConfig: {
				primary: 'ins',
				secondary: 'ins',
				modifier: this.bonus,
				title: `${StringUtils.localize(FU.actionTypes.study)} ${StringUtils.localize('FU.Check')}`,
			},
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
				title: `${StringUtils.localize(FU.actionTypes.hinder)} ${StringUtils.localize('FU.Check')}`,
			},
		});
	}

	/**
	 * @desc Performs an attack with one of the equipped weapons or attacks.
	 * @returns {Promise<void>}
	 */
	async attack() {
		const resolution = await WeaponResolver.prompt(this.actor, true);
		if (resolution?.item) {
			resolution.item.roll();
		}
	}

	/**
	 * @desc Attempts to roll a check for one of the existing clocks.
	 * @returns {Promise<void>}
	 */
	async objective() {
		// TODO: Look at active clocks in party/scene and roll a check to advance them
		return CheckPrompt.attributeCheck(this.actor);
	}

	/**
	 * @desc Opens a dialog to swap the current equipment.
	 * @returns {Promise<void>}
	 */
	async equipment() {
		const dialog = new EquipmentHandlerDialog(this.actor);
		dialog.render(true);
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

	static skillsWithApps = ['invocations', 'verse'];

	/**
	 * @param {FUActor} actor
	 * @param element
	 */
	static setupMenu(actor, element) {
		// ATTACKS
		const attacks = WeaponResolver.getEquippedWeapons(actor, true);
		FoundryUtils.itemContextMenu(element, '[data-context-menu="attack"]', attacks);
		// SPELLS
		const spells = ['spell'].map((t) => actor.getItemsByType(t)).flat();
		FoundryUtils.itemContextMenu(element, '[data-context-menu="spell"]', spells);
		// INVENTORY
		const consumables = ['consumable'].map((t) => actor.getItemsByType(t)).flat();
		FoundryUtils.itemContextMenu(element, '[data-context-menu="inventory"]', consumables);
		// SKILLS
		/** @type {FUItem[]} **/
		let skills = ['skill', 'miscAbility']
			.map((t) => actor.getItemsByType(t))
			.flat()
			.filter((s) => {
				return !s.system.passive;
			});
		for (const fuid of ActionHandler.skillsWithApps) {
			const skill = actor.getItemsByFuid(fuid);
			if (skill) {
				skills.push(...skill);
			}
		}
		FoundryUtils.itemContextMenu(element, '[data-context-menu="skill"]', skills);
	}
}
