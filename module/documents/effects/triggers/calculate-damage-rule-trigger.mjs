import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode CalculateDamageEvent}
 * @extends RuleTriggerDataModel
 * @property {Set<FUItemGroup>} damageSources
 * @property {Set<DamageType>} damageTypes
 * @inheritDoc
 */
export class CalculateDamageRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.CALCULATE_DAMAGE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'calculateDamageRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			damageSources: new fields.SetField(new fields.StringField()),
			damageTypes: new fields.SetField(new fields.StringField()),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerCalculateDamage';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/calculate-damage-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<CalculateDamageEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.damageSources.size > 0 && !this.damageSources.has(context.event.damageSource)) {
			return false;
		}
		if (this.damageTypes.size > 0 && !this.damageTypes.has(context.event.type)) {
			return false;
		}
		return true;
	}
}
