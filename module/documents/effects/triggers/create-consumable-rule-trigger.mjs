import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';
import { ConsumableTraits } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {TraitsDataModel} traits
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
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: FoundryUtils.getFormOptions(ConsumableTraits, (k, v) => k),
			}),
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
		// TODO: Use the data model..
		if (this.traits.assigned) {
			for (const trait of this.traits.selected) {
				if (!context.event.consumable.traits.has(trait)) {
					return false;
				}
			}
		}
		return true;
	}
}
