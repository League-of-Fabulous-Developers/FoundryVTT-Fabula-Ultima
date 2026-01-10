import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} amount
 */
export class ModifyResourceRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'modifyResourceRuleAction' });
	}

	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.CALCULATE_RESOURCE_EVENT, FUHooks.CALCULATE_EXPENSE_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			amount: new fields.StringField({ blank: true }),
		});
	}

	static get localization() {
		return 'FU.RuleActionModifyResource';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-resource-rule-action');
	}

	async execute(context, selected) {
		const expressionContext = context.getExpressionContext(selected);
		const _amount = await Expressions.evaluateAsync(this.amount, expressionContext);

		switch (context.eventType) {
			case FUHooks.CALCULATE_EXPENSE_EVENT:
				{
					/** @type CalculateExpenseEvent **/
					const ree = context.event;
					ree.expense.amount += _amount;
				}
				break;

			case FUHooks.CALCULATE_RESOURCE_EVENT:
				{
					/** @type CheckConfigurer **/
					const config = context.event.config;
					config.getResource().addModifier(context.label, _amount);
				}
				break;
		}
	}
}
