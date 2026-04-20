import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based on a {@linkcode CalculateResourceEvent}
 * @extends RuleTriggerDataModel
 * @property {FUResourceType} resource
 * @property {FUScalarChange} change
 * @property {Set<FUItemGroup>} itemGroups
 * @property {String} identifier
 * @property {Boolean} local
 * @inheritDoc
 */
export class CalculateResourceRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.CALCULATE_RESOURCE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'calculateResourceRuleTrigger' });
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
			itemGroups: new fields.SetField(new fields.StringField()),
			identifier: new fields.StringField(),
			local: new fields.BooleanField(),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerCalculateResource';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/calculate-resource-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<CalculateResourceEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.data.type !== this.resource) {
			return false;
		}
		const amount = context.event.data.amount;
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

		if (this.itemGroups.size > 0 && !this.itemGroups.has(context.event.itemGroup)) {
			return false;
		}
		if (this.identifier) {
			if (!context.matchesItem(this.identifier)) {
				return false;
			}
		}
		if (this.local) {
			if (!context.isLocalItem()) {
				return false;
			}
		}

		return true;
	}
}
