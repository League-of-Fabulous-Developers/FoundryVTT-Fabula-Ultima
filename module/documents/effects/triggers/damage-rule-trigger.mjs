import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ComparisonOperations } from '../../../helpers/comparison-operations.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode DamageEvent}
 * @extends RuleTriggerDataModel
 * @property {DamageType} damageTypes
 * @property {FUAffinity} affinity
 * @property {Set<FUItemGroup>} itemGroups
 * @property {FUThreshold} damageThreshold
 * @property {String} identifier
 * @property {Boolean} local
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
		return Object.assign(super.defineSchema(), {
			damageType: new fields.StringField({
				initial: '',
				choices: Object.keys(FU.damageTypes),
				blank: true,
			}),
			affinity: new fields.StringField({
				initial: '',
				choices: Object.keys(FU.affValue),
				blank: true,
			}),
			itemGroups: new fields.SetField(new fields.StringField()),
			damageThreshold: new fields.SchemaField({
				operator: new fields.StringField({
					initial: '',
					blank: true,
					choices: Object.keys(FU.comparisonOperator),
				}),
				amount: new fields.NumberField({ initial: 0 }),
			}),
			identifier: new fields.StringField(),
			local: new fields.BooleanField({ initial: false }),
		});
	}

	static migrateData(source) {
		if (source.damageSources) {
			source.itemGroups = source.damageSources;
			delete source.damageSources;
		}
		return super.migrateData(source);
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
		// Prevent [action > trigger > cascading
		if (context.origin === context.event.origin) {
			return false;
		}

		// If this RE is on an item, and it doesn't match the item in the event.
		if (this.local) {
			if (!context.isLocalItem()) {
				return false;
			}
		}
		// Check identifier
		else if (this.identifier) {
			if (!context.matchesItem(this.identifier)) {
				return false;
			}
		}

		if (this.damageType) {
			if (this.damageType !== context.event.type) {
				return false;
			}
		}
		if (this.itemGroups.size > 0) {
			if (!this.itemGroups.has(context.event.itemGroup)) {
				return false;
			}
		}

		if (this.damageThreshold.operator) {
			const comparisonOperation = ComparisonOperations[this.threshold.operator];
			if (!comparisonOperation(context.event.amount, this.threshold.amount)) {
				return false;
			}
		}

		if (this.affinity) {
			if (context.event.affinity !== this.affinity) {
				return false;
			}
		}

		return true;
	}
}
