import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ComparisonOperations } from '../../../helpers/comparison-operations.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUResourceType} resource
 */
export class ResourceRulePredicate extends RulePredicateDataModel {
	static defineSchema() {
		return {
			// TODO: Add other parameters
			resource: new fields.StringField({
				initial: 'hp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
			change: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.scalarChange),
			}),
			changeThreshold: new fields.SchemaField({
				operator: new fields.StringField({
					initial: '',
					blank: true,
					choices: {
						max: 'FU.Max',
						...FU.comparisonOperator,
					},
				}),
				amount: new fields.NumberField({ initial: 0 }),
			}),
			local: new fields.BooleanField({ initial: false }),
			identifier: new fields.StringField({ initial: '' }),
		};
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
		if (context.origin === context.event.origin || !context.character) return false;
		if (this.local && !context.isLocalItem()) return false;
		if (this.identifier && !context.matchesItem(this.identifier)) return false;

		const actor = context.character?.actor;

		if (!actor) return false;

		const { value, max } = actor.system.resources[this.resource];
		if (value === undefined) return false;

		if (!this.changeThreshold.operator) return false;

		if (this.changeThreshold.operator === 'max') return value >= max;

		if (this.changeThreshold.operator) {
			const comparisonOperation = ComparisonOperations[this.changeThreshold.operator];
			if (comparisonOperation(Math.abs(value), Math.abs(this.changeThreshold.amount))) return true;
		}

		return false;
	}
}
