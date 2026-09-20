import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { Expressions } from '../../../expressions/expressions.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} amount
 * @property {FUScalarOperation} operation
 */
export class ModifyResourceRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			amount: new fields.StringField({ blank: true }),
			operation: new fields.StringField({ initial: 'add', choices: Object.keys(FU.scalarOperation) }),
		};
	}

	/**
	 * @inheritDoc
	 */
	static get eventTypes() {
		return [FUHooks.CALCULATE_RESOURCE_EVENT, FUHooks.CALCULATE_EXPENSE_EVENT, FUHooks.CONSUMABLE_CREATE_EVENT];
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
			case FUHooks.CALCULATE_EXPENSE_EVENT: {
				/** @type CalculateExpenseEvent **/
				const ree = context.event;
				switch (this.operation) {
					case 'add': {
						if (_amount !== 0) {
							ree.expense.amount += _amount;
						}
						break;
					}
					case 'multiply':
						if (_amount !== 1) {
							ree.expense.multiplier *= _amount;
						}
						break;
				}
				break;
			}

			case FUHooks.CALCULATE_RESOURCE_EVENT: {
				/** @type CheckConfigurer **/
				const config = context.event.config;
				switch (this.operation) {
					case 'add': {
						if (_amount !== 0) {
							config.getResource().addModifier(context.label, _amount);
						}
						break;
					}
					case 'multiply': {
						if (_amount !== 1) {
							config.getResource().addMultiplier(context.label, _amount);
						}
					}
				}
				break;
			}

			case FUHooks.CONSUMABLE_CREATE_EVENT: {
				let resource = context.data.actions?.resource;
				if (resource) {
					switch (this.operation) {
						case 'add': {
							if (_amount !== 0) {
								resource.bonus += _amount;
							}
							break;
						}
						case 'multiply': {
							if (_amount !== 1) {
								resource.multiplier *= _amount;
							}
							break;
						}
					}
				}
				break;
			}
		}
	}
}
