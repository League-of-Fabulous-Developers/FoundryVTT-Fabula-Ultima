import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based when the active effect is enabled or disabled
 * @property {Boolean} enabled
 */
export class ToggleRuleTrigger extends RuleTriggerDataModel {
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			enabled: new fields.BooleanField({ initial: true }),
		});
	}

	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.EFFECT_TOGGLED_EVENT;
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
		let enabled = context.event.enabled === this.enabled;
		let sameOrigin = context.event.uuid === context.effect.uuid;
		return enabled && sameOrigin;
	}
}
