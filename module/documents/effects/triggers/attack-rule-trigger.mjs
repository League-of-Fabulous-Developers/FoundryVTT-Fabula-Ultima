import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

/**
 * @description Trigger based on an attack event
 * @extends RuleTriggerDataModel
 * @inheritDoc
 */
export class AttackRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.ATTACK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'attackRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
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
