import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

/**
 * @property {String} bonus
 * @property {String} multiplier
 */
export class ModifyConsumableRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {};
	}

	/**
	 * @inheritDoc
	 */
	static get eventTypes() {
		return [FUHooks.CONSUMABLE_CREATE_EVENT];
	}

	static get localization() {
		return 'FU.RuleActionModifyConsumable';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-consumable-rule-action');
	}

	/**
	 * @param {RuleElementContext<CreateConsumableEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		ui.notifications.warn(`The 'ModifyConsumableRuleAction' is deprecated for removal. Until then it is without function. Source: ${context.effect.name} in ${context.effect.actor}`);
	}
}
