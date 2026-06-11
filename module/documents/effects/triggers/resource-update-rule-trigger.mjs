import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ComparisonOperations } from '../../../helpers/comparison-operations.mjs';

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
		return Object.assign(super.defineSchema(), {
			resource: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.resources) }),
			change: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.scalarChange) }),
			changeThreshold: new fields.SchemaField({
				operator: new fields.StringField({
					initial: '',
					blank: true,
					choices: Object.keys(FU.comparisonOperator),
				}),
				amount: new fields.NumberField({ initial: 0 }),
			}),
			itemGroups: new fields.SetField(new fields.StringField()),
			identifier: new fields.StringField(),
			local: new fields.BooleanField({ initial: false }),
		});
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

		if (this.resource) {
			if (context.event.resource !== this.resource) {
				return false;
			}
		}

		const amount = context.event.amount;
		if (this.change) {
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
		}

		if (this.changeThreshold.operator) {
			const comparisonOperation = ComparisonOperations[this.changeThreshold.operator];
			if (!comparisonOperation(Math.abs(amount), Math.abs(this.changeThreshold.amount))) {
				return false;
			}
		}

		if (this.itemGroups.size > 0) {
			if (!this.itemGroups.has(context.event.itemGroup)) {
				return false;
			}
		}

		// If this RE is on an item, and it doesn't match the item in the event.
		if (this.local) {
			if (!context.isLocalItem()) {
				return false;
			}
		}
		// Check identifier
		else if (this.identifier) {
			if (!context.matchesItem(this.identifier)) {
				return false;
			}
		}

		return true;
	}
}
