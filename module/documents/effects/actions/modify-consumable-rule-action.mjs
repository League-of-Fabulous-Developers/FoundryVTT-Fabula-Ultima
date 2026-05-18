import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} bonus
 * @property {String} multiplier
 */
export class ModifyConsumableRuleAction extends RuleActionDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.CONSUMABLE_CREATE_EVENT],
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'modifyConsumableRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			bonus: new fields.StringField({ blank: true, nullable: false }),
			multiplier: new fields.StringField({ blank: true, nullable: false }),
		});
	}

	static get localization() {
		return 'FU.RuleActionModifyConsumable';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-consumable-rule-action');
	}

	/**
	 * @param {RuleElementContext<CreateConsumableEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		// TODO: Do different things based on the item traits?
		if (context.event.builder) {
			const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, context.targetActors);
			if (this.bonus) {
				context.event.builder.bonus += await Expressions.evaluateAsync(this.bonus, expressionContext);
			}
			if (this.multiplier) {
				context.event.builder.multiplier *= await Expressions.evaluateAsync(this.multiplier, expressionContext, false);
			}
		}
	}
}
