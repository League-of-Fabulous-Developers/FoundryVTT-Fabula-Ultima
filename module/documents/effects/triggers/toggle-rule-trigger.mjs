import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based when the active effect is enabled or disabled
 * @property {Boolean} enabled
 */
export class ToggleRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.EFFECT_TOGGLED_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'toggleRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			enabled: new fields.BooleanField({
				initial: true,
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerToggle';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/toggle-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<EffectToggledEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.enabled !== this.enabled) {
			return false;
		}
		if (context.event.uuid !== context.effect.uuid) {
			return false;
		}
		return true;
	}
}
