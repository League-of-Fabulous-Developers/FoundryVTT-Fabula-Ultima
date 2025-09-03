import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

export class ModifyCheckRuleAction extends RuleActionDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.PERFORM_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'modifyCheckRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			bonus: new fields.StringField({ blank: true, nullable: false }),
		});
	}

	static get localization() {
		return 'FU.RuleActionModifyCheck';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-check-rule-action');
	}

	/**
	 * @param {RuleElementContext<PerformCheckEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		if (context.event.check) {
			const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, []);
			const modifier = await Expressions.evaluateAsync(this.bonus, expressionContext);
			CheckConfiguration.configure(context.event.check).addModifier(context.effect.name, modifier);
		}
	}
}
