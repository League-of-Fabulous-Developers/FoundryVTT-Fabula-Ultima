import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

import { FU } from '../../../helpers/config.mjs';
import { TraitsPredicateDataModel } from '../../items/common/traits-predicate-data-model.mjs';
import { FeatureTraits, TraitUtils } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {FUResourceType} resource
 * @property {FUExpenseSource} expenseSource
 * @property {String} identifier
 * @property {TraitsPredicateDataModel} traits
 * @property {FUThreshold} threshold
 * @inheritDoc
 */
export class CalculateExpenseRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.CALCULATE_EXPENSE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'calculateExpenseRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			resource: new fields.StringField({
				initial: 'mp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
			expenseSource: new fields.StringField({
				initial: '',
				choices: Object.keys(FU.expenseSource),
				blank: true,
			}),
			threshold: new fields.SchemaField({
				operator: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.comparisonOperator) }),
				amount: new fields.NumberField({ initial: 0 }),
			}),
			identifier: new fields.StringField(),
			traits: new fields.EmbeddedDataField(TraitsPredicateDataModel, {
				options: TraitUtils.getOptions(FeatureTraits),
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerCalculateExpense';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/calculate-expense-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<CalculateExpenseEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.expense.resource !== this.resource) {
			return false;
		}
		if (this.expenseSource && context.event.expense.source !== this.expenseSource) {
			return false;
		}
		if (!this.traits.evaluate(context.event.expense.traits)) {
			return false;
		}
		if (this.identifier) {
			if (!context.matchesItem(this.identifier)) {
				return false;
			}
		}
		if (this.threshold.operator) {
			const amount = context.event.expense.amount;
			if (Number.isInteger(amount)) {
				switch (this.threshold.operator) {
					case 'greaterThan':
						if (amount >= this.threshold.amount) {
							return true;
						}
						break;

					case 'lessThan':
						if (amount <= this.threshold.amount) {
							return true;
						}
						break;
				}
				return false;
			} else {
				console.warn(`The given amount in the event was not an integer.`);
			}
		}
		return true;
	}
}
