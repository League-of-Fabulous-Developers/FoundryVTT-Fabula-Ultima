import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUStatusEffectKey} effect
 * @property {FUTargetSelectorKey} selector
 */
export class EffectRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'targetEffectRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			selector: new fields.StringField({
				initial: 'initial',
				blank: true,
				choices: Object.keys(FU.targetSelector),
			}),
			effect: new fields.StringField({
				initial: 'slow',
			}),
		});
	}

	static get localization() {
		return 'FU.RulePredicateEffect';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/effect-rule-predicate');
	}

	validateContext(context) {
		const selected = context.selectTargets(this.selector);
		for (const character of selected) {
			const resolvedEffect = character.actor.resolveEffect(this.effect);
			if (resolvedEffect) {
				return true;
			}
		}
		return false;
	}
}
