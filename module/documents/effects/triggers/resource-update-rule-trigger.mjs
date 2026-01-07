import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {FUResourceType} resource
 * @property {FUScalarChange} change
 * @inheritDoc
 */
export class ResourceUpdateRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RESOURCE_UPDATE,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'resourceUpdateRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			resource: new fields.StringField({
				initial: 'hp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
			change: new fields.StringField({
				initial: 'increment',
				choices: Object.keys(FU.scalarChange),
				required: true,
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerResourceUpdate';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/resource-update-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<ResourceUpdateEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		// Prevent [action > trigger> cascading
		if (context.origin === context.event.origin) {
			return false;
		}

		if (context.event.resource !== this.resource) {
			return false;
		}
		const amount = context.event.amount;
		switch (this.change) {
			case 'decrement':
				if (amount > 0) {
					return false;
				}
				break;

			case 'increment':
				if (amount < 0) {
					return false;
				}
				break;
		}

		return true;
	}
}
