import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode CalculateDamageEvent}
 * @extends RuleTriggerDataModel
 * @property {FUResourceType} resource
 * @property {FUExpenseSource} expenseSource
 * @inheritDoc
 */
export class ResourceExpendRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RESOURCE_EXPEND_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'resourceExpendRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			resource: new fields.StringField({
				initial: 'hp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
			expenseSource: new fields.StringField({
				initial: '',
				choices: Object.keys(FU.expenseSource),
				blank: true,
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerResourceExpend';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/resource-expend-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<ResourceExpendEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.expense.resource !== this.resource) {
			return false;
		}
		if (context.event.expense.source !== this.expenseSource) {
			return false;
		}
		return true;
	}
}
