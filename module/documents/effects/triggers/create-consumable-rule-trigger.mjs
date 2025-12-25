import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { TraitsPredicateDataModel } from '../../items/common/traits-predicate-data-model.mjs';
import { ConsumableTraits, TraitUtils } from '../../../pipelines/traits.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {TraitsPredicateDataModel} traits
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
			traits: new fields.EmbeddedDataField(TraitsPredicateDataModel, {
				options: TraitUtils.getOptions(ConsumableTraits),
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
		return this.traits.evaluate(context.event.consumable.traits.selected);
	}
}
