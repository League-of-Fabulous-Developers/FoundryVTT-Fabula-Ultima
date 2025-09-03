import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUResourceType} resource
 */
export class ResourceRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'resourceRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			// TODO: Add other parameters
			resource: new fields.StringField({
				initial: 'hp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
		});
	}

	static get localization() {
		return 'FU.RulePredicateResource';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/resource-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		// TODO: Implement
		return false;
	}
}
