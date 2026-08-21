import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

/**
 * @description Trigger based on an attack event
 * @extends RuleTriggerDataModel
 * @inheritDoc
 */
export class AttackRuleTrigger extends RuleTriggerDataModel {
	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.ATTACK_EVENT;
	}

	static get localization() {
		return 'FU.RuleTriggerAttack';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/attack-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<AttackEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		return true;
	}
}
