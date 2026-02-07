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
 * @property {TraitsPredicateDataModel} traits
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
			traits: new fields.EmbeddedDataField(TraitsPredicateDataModel, {
				options: TraitUtils.getOptions(FeatureTraits),
			}),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
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
		return true;
	}
}
