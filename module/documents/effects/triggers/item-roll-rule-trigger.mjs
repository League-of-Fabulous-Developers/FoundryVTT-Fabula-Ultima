import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

//const fields = foundry.data.fields;

/**
 * @description Trigger based when the active effect is enabled or disabled
 * @property {Boolean} enabled
 */
export class ItemRollRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.ITEM_ROLL_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'itemRollRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerItemRoll';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/item-roll-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<EffectToggledEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		return true;
	}
}
