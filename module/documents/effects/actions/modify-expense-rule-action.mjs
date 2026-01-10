import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

/**
 * @property {DamageType} damageType
 * @property {String} amount
 */
export class ModifyExpenseRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'modifyExpenseRuleAction' });
	}

	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.CALCULATE_EXPENSE_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			amount: new fields.StringField({ blank: true }),
		});
	}

	static get localization() {
		return 'FU.RuleActionModifyExpense';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-expense-rule-action');
	}

	/**
	 * @param {RuleElementContext<CalculateExpenseEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		if (this.amount) {
			const targets = selected.map((t) => t.actor);
			const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
			const amount = await Expressions.evaluateAsync(this.amount, expressionContext);
			context.event.expense.amount += amount;
		}
	}
}
