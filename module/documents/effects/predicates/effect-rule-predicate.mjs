import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUStatusEffectKey} effect *
 * @property {FUTargetSelectorKey} selector
 * @property {FUPredicateQuantifier} quantifier
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
			quantifier: new fields.StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
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
		switch (this.quantifier) {
			case 'all':
				// All selected actors must have the effect
				return selected.every((character) => character.actor.resolveEffect(this.effect));

			case 'any':
				// At least one actor must have the effect
				return selected.some((character) => character.actor.resolveEffect(this.effect));

			case 'none':
				// No actor should have the effect
				return selected.every((character) => !character.actor.resolveEffect(this.effect));
		}
		return false;
	}
}
