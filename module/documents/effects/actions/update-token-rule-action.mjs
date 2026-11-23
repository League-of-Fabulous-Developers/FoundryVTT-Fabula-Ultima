import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

/**
 * @property {Number} tokenScale
 * @property {String} tokenImage Path to the image
 * @property {FUCommand} command
 */
export class UpdateTokenRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {};
	}

	static get localization() {
		return 'FU.RuleActionUpdateToken';
	}

	static get template() {
		return systemTemplatePath('effects/actions/update-token-rule-action');
	}

	async execute(context, selected) {
		ui.notifications.warn(`The 'UpdateTokenRuleAction' is deprecated for removal. Until then it is without function. Use standard Active Effect changes instead. Source: ${context.effect.name} in ${context.effect.actor}`);
	}
}
