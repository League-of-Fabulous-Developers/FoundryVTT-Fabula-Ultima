import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { DamagePipeline, DamageRequest } from '../../../pipelines/damage-pipeline.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { SETTINGS } from '../../../settings.js';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';
import { DamageTraits, TraitUtils } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} amount
 * @property {FU.damageTypes} damageType
 * @property {TraitsDataModel} traits
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
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptions(DamageTraits),
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
		const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets).withCheck(context.check);
		const evalAmount = await Expressions.evaluateAsync(this.amount, expressionContext);

		if (context.config) {
			if (context.check) {
				const _traits = this.traits.values;
				context.config.addTraits(_traits);

				switch (context.check.type) {
					case 'display':
						context.config.setDamage(this.damageType, evalAmount);
						break;

					case 'accuracy':
					case 'magic':
						context.config.damage.addModifier(context.label, evalAmount, [this.damageType]);
						break;
				}
			}
		} else {
			const request = new DamageRequest(context.sourceInfo, targets, {
				type: this.damageType,
				total: evalAmount,
			});
			if (!this.traits.empty) {
				request.addTraits(this.traits.values);
			}
			request.fromOrigin(context.origin);

			if (game.settings.get(SYSTEM, SETTINGS.automationApplyDamage)) {
				await DamagePipeline.process(request);
			} else {
				await DamagePipeline.promptApply(request);
			}
		}
	}
}
