import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {Set<String>} traits
 * @inheritDoc
 */
export class CreateConsumableRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.CONSUMABLE_CREATE_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'createConsumableRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			traits: new fields.SetField(new fields.StringField()),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerCreateConsumable';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/create-consumable-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<CreateConsumableEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.traits.size > 0) {
			for (const trait of this.traits.values()) {
				if (!context.event.consumable.traits.has(trait)) {
					return false;
				}
			}
		}
		return true;
	}
}
