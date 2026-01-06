import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { ActionCostDataModel } from '../../items/common/action-cost-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { SkillDataModel } from '../../items/skill/skill-data-model.mjs';
import { DamageTraits, SkillTraits, TraitUtils } from '../../../pipelines/traits.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {DamageType} damageType
 * @property {String} amount
 * @property {TraitsDataModel} traits
 * @property {Set<DamageType>} damageTypes
 * @property {ActionCostDataModel} cost
 * @property {String} variant
 */
export class ModifyDamageRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'modifyDamageRuleAction' });
	}

	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.CALCULATE_DAMAGE_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			amount: new fields.StringField({ blank: true }),
			damageTypes: new fields.SetField(new fields.StringField()),
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptions(DamageTraits),
			}),
			cost: new fields.EmbeddedDataField(ActionCostDataModel, {
				resource: {
					initial: '',
				},
			}),
			variant: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.modifyDamageVariant),
			}),
		});
	}

	static get localization() {
		return 'FU.RuleActionModifyDamage';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-damage-rule-action');
	}

	/**
	 * @param {RuleElementContext<CalculateDamageEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		let _amount = 0;
		const types = Array.from(this.damageTypes);

		if (this.amount) {
			const targets = selected.map((t) => t.actor);
			const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
			_amount = await Expressions.evaluateAsync(this.amount, expressionContext);
		}

		if (this.variant) {
			switch (this.variant) {
				case 'overChannel': {
					/** @type SkillDataModel **/
					const skill = context.item.system;
					if (!(skill instanceof SkillDataModel)) {
						return;
					}
					for (let sl = 1; sl <= skill.level.value; sl++) {
						context.config.getDamage().addModifier(context.label, _amount * sl, types, {
							expense: {
								amount: this.cost.amount * sl,
								resource: this.cost.resource,
							},
							traits: this.traits.values,
							enabled: false,
						});
					}
					break;
				}

				case 'psychicGift': {
					const brainwave = context.character.actor.resolveProgress('brainwave-clock');
					context.config.getDamage().addModifier(context.label, _amount, types, {
						expense: {
							amount: Math.max(5, this.cost.amount * brainwave.current),
							resource: this.cost.resource,
							traits: [SkillTraits.Gift],
						},
						traits: this.traits.values,
						enabled: false,
					});
					break;
				}
			}
		} else {
			if (this.damageTypes.size > 0 || this.cost.amount > 0 || !this.traits.empty) {
				context.config.getDamage().addModifier(context.label, _amount, types, {
					expense: this.cost,
					traits: this.traits.values,
					enabled: this.cost.amount === 0,
				});
			} else {
				context.config.addDamageBonus(context.label, _amount);
				// TODO: Verify...
				context.config.addTraits(this.traits.values);
			}
		}
	}
}
