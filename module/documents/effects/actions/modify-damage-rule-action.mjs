import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { ActionCostDataModel } from '../../items/common/action-cost-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { SkillDataModel } from '../../items/skill/skill-data-model.mjs';
import { DamageTraits, FeatureTraits, TraitUtils } from '../../../pipelines/traits.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {DamageType} damageType
 * @property {String} amount
 * @property {FUScalarOperation} operation
 * @property {TraitsDataModel} traits
 * @property {Set<DamageType>} damageTypes
 * @property {ActionCostDataModel} cost
 * @property {String} variant
 */
export class ModifyDamageRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			amount: new fields.StringField({ blank: true }),
			operation: new fields.StringField({ initial: 'add', choices: Object.keys(FU.scalarOperation) }),
			damageTypes: new fields.SetField(new fields.StringField()),
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: TraitUtils.getOptions(DamageTraits),
			}),
			cost: new fields.EmbeddedDataField(ActionCostDataModel, {
				resource: '',
			}),
			variant: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.modifyDamageVariant),
			}),
		};
	}

	/**
	 * @inheritDoc
	 */
	static get eventTypes() {
		return [FUHooks.CALCULATE_DAMAGE_EVENT, FUHooks.DAMAGE_EVENT, FUHooks.CONSUMABLE_CREATE_EVENT];
	}

	static get localization() {
		return 'FU.RuleActionModifyDamage';
	}

	static get template() {
		return systemTemplatePath('effects/actions/modify-damage-rule-action');
	}

	#variantHandlers = {
		overChannel: this.#handleOverChannel.bind(this),
		psychicGift: this.#handlePsychicGift.bind(this),
	};

	/**
	 * @param {RuleElementContext<CalculateDamageEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		let _amount = 0;

		const targets = selected.map((t) => t.actor);
		const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
		if (this.amount) {
			_amount = await Expressions.evaluateAsync(this.amount, expressionContext);
		}

		if (this.variant) {
			this.#variantHandlers[this.variant]?.(context, _amount);
		} else {
			if (this.damageTypes.size > 0 || this.cost.amount > 0 || !this.traits.empty) {
				this.modifyDamage(context, context.label, _amount, this.cost, !this.cost?.assigned);
			} else {
				switch (context.eventType) {
					case FUHooks.CALCULATE_DAMAGE_EVENT: {
						switch (this.operation) {
							case 'add': {
								if (_amount !== 0) context.data.config.addDamageBonus(context.label, _amount);
								break;
							}
							case 'multiply': {
								if (_amount !== 1) context.data.config?.addDamageMulti(context.label, _amount);
								break;
							}
						}
						break;
					}
					case FUHooks.DAMAGE_EVENT: {
						switch (this.operation) {
							case 'add': {
								if (_amount !== 0) context.event.damageContext.addBonus(context.label, _amount);
								break;
							}
							case 'multiply': {
								if (_amount !== 1) context.event.damageContext.addModifier(context.label, _amount);
								break;
							}
						}
						break;
					}
					case FUHooks.CONSUMABLE_CREATE_EVENT: {
						const damageActions = context.data.actions.damage ?? {};
						for (const builder of Object.values(damageActions)) {
							switch (this.operation) {
								case 'add':
									builder.bonus += _amount;
									break;
								case 'multiply':
									builder.multiplier *= _amount;
									break;
							}
						}
						break;
					}
				}
			}
		}
	}

	modifyDamage(context, label, amount, expense, enabled) {
		const types = Array.from(this.damageTypes);
		const traits = this.traits.values;
		switch (context.eventType) {
			case FUHooks.CALCULATE_DAMAGE_EVENT: {
				const data = {
					expense: expense,
					traits: traits,
					enabled: enabled,
				};
				switch (this.operation) {
					case 'add': {
						context.data.config.getDamage().addModifier(label, amount, types, { ...data });
						break;
					}
					case 'multiply': {
						context.data.config.getDamage().addMultiplier(context.label, amount, types, { ...data });
						break;
					}
				}
				break;
			}
			case FUHooks.DAMAGE_EVENT: {
				const damageContext = context.event.damageContext;
				switch (this.operation) {
					case 'add': {
						if (amount !== 0) {
							damageContext.addBonus(label, amount);
						}
						break;
					}
					case 'multiply': {
						if (amount !== 1) {
							damageContext.addModifier(context.label, amount);
						}
						break;
					}
				}
				if (types && types.length > 0) {
					damageContext.damageType = types[0];
				}
				if (traits && traits.length > 0) {
					traits.forEach((value) => damageContext.traits.add(value));
				}
				break;
			}
			case FUHooks.CONSUMABLE_CREATE_EVENT: {
				const damageActions = context.data.actions.damage ?? {};
				for (const builder of Object.values(damageActions)) {
					switch (this.operation) {
						case 'add': {
							builder.bonus += amount;
							break;
						}
						case 'multiply': {
							builder.multiplier *= amount;
							break;
						}
					}
				}
				break;
			}
		}
	}

	#handleOverChannel(context, amount) {
		/** @type SkillDataModel **/
		const skill = context.item.system;
		if (!(skill instanceof SkillDataModel)) {
			return;
		}
		for (let sl = 1; sl <= skill.level.value; sl++) {
			const expense = {
				amount: this.cost.amount * sl,
				resource: this.cost.resource,
			};

			this.modifyDamage(context, context.label, amount * sl, expense, false);
		}
	}

	#handlePsychicGift(context, amount) {
		const brainwave = context.character.actor.resolveProgress('brainwave-clock');
		const expense = {
			amount: Math.max(5, this.cost.amount * brainwave.current),
			resource: this.cost.resource,
			traits: [FeatureTraits.Gift],
		};
		this.modifyDamage(context, context.label, amount, expense, false);
	}
}
