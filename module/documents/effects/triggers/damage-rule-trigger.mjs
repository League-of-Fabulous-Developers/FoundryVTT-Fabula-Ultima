import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode DamageEvent}
 * @extends RuleTriggerDataModel
 * @property {DamageType} damageTypes
 * @property {Set<FUItemGroup>} damageSource
 * @property {FUComparisonOperator} damageThreshold.operator
 * @property {Number} damageThreshold.amount
 * @inheritDoc
 */
export class DamageRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.DAMAGE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'damageRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			damageType: new fields.StringField({
				initial: '',
				choices: Object.keys(FU.damageTypes),
				blank: true,
			}),
			damageSources: new fields.SetField(new fields.StringField()),
			damageThreshold: new fields.SchemaField({
				operator: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.comparisonOperator) }),
				amount: new fields.NumberField({ initial: 0 }),
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerDamage';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/damage-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<DamageEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		// Prevent [action > trigger> cascading
		if (context.origin === context.event.origin) {
			return false;
		}
		if (this.damageType) {
			if (this.damageType !== context.event.type) {
				return false;
			}
		}
		if (this.damageSources.size > 0) {
			if (!this.damageSources.has(context.event.damageSource)) {
				return false;
			}
		}

		if (this.damageThreshold.operator) {
			switch (this.damageThreshold.operator) {
				case 'greaterThan':
					if (context.event.amount >= this.damageThreshold.amount) {
						return true;
					}
					break;

				case 'lessThan':
					if (context.event.amount <= this.damageThreshold.amount) {
						return true;
					}
					break;
			}
			return false;
		}

		return true;
	}
}
