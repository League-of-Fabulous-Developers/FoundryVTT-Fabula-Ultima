import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUTargetingPredicate} rule
 */
export class TargetingRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'targetingRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			rule: new fields.StringField({
				initial: 'single',
				choices: Object.keys(FU.targetingPredicate),
				required: true,
			}),
		});
	}

	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RulePredicateTargeting';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/targeting-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		switch (this.rule) {
			case 'none':
				return context.targets.length === 0;
			case 'single':
				return context.targets.length === 1;
			case 'multiple':
				return context.targets.length >= 2;
		}
		return false;
	}
}
