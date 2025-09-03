import { FU } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { DamagePipeline, DamageRequest } from '../../../pipelines/damage-pipeline.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} amount
 * @property {FU.damageTypes} damageType
 */
export class ApplyDamageRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'applyDamageRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			amount: new fields.StringField({ blank: true }),
			damageType: new fields.StringField({
				initial: 'physical',
				choices: Object.keys(FU.damageTypes),
				blank: true,
				nullable: false,
			}),
		});
	}

	static get localization() {
		return 'FU.RuleActionApplyDamage';
	}

	static get template() {
		return systemTemplatePath('effects/actions/apply-damage-rule-action');
	}

	async execute(context, selected) {
		const targets = selected.map((t) => t.actor);
		const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
		const amount = await Expressions.evaluateAsync(this.amount, expressionContext);
		const request = new DamageRequest(context.sourceInfo, targets, {
			type: this.damageType,
			total: amount,
		});
		request.fromOrigin(context.origin);
		await DamagePipeline.process(request);
	}
}
