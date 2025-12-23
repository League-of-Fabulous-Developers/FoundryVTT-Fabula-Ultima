import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

/**
 * @property {DamageType} damageType
 * @property {String} amount
 * @property {Set<DamageType>} damageTypes
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
		if (this.amount) {
			const targets = selected.map((t) => t.actor);
			const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
			_amount = await Expressions.evaluateAsync(this.amount, expressionContext);
		}

		// If there's damage types, we must provide options
		if (this.damageTypes.size > 0) {
			// const choices = new Set([context.event.configuration.getDamage().type, ...this.damageTypes]);
			// const options = FoundryUtils.generateConfigIconOptions(choices, FU.damageTypes, FU.affIcon);
			// // TODO: Localize
			// const message = `You are able to change the damage type due to <strong>${context.label}</strong>.`;
			// const title = `${context.event.configuration.check.itemName} : ${StringUtils.localize('FU.SelectDamageType')}`;
			// const selected = await FoundryUtils.selectIconOptionDialog(title, options, {
			// 	message: message,
			// });
			// if (selected) {
			// 	context.event.configuration.setDamageType(selected);
			// }

			// context.event.configuration.modifyDamage((data) => {
			// 	data.addModifier(context.label, _amount, {
			// 		enabled: true,
			// 		types: Array.from(this.damageTypes),
			// 	});
			// });

			context.event.configuration.getDamage().addModifier(context.label, _amount, Array.from(this.damageTypes));
		} else {
			context.event.configuration.addDamageBonus(context.label, _amount);
		}
	}
}
