import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { TraitsPredicateDataModel } from '../../items/common/traits-predicate-data-model.mjs';
import { Traits, TraitUtils } from '../../../pipelines/traits.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';

const fields = foundry.data.fields;

/**
 * @property {TraitsPredicateDataModel} traits
 */
export class TraitsRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'traitsRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			traits: new fields.EmbeddedDataField(TraitsPredicateDataModel, {
				options: TraitUtils.getOptions(Traits),
			}),
		});
	}

	static get localization() {
		return 'FU.RulePredicateTraits';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/traits-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		let _traits = new Set();

		// Consumable
		if (context.eventType === FUHooks.CONSUMABLE_CREATE_EVENT) {
			/** @type CreateConsumableEvent **/
			const cre = context.event;
			for (const t of cre.consumable.traits.values) {
				_traits.add(t);
			}
		}
		// If a check configuration is provided
		if (context.config) {
			for (const t of context.config.getTraits()) {
				_traits.add(t);
			}
		}
		// If the event has an item reference, check it for traits
		if (context.event.item?.system?.traits) {
			if (context.event.item.system.traits instanceof TraitsDataModel) {
				for (const t of context.event.item.system.traits.values) {
					_traits.add(t);
				}
			} else if (context.event.item.system.traits instanceof Set) {
				for (const t of context.event.item.system.traits) {
					_traits.add(t);
				}
			}
		}

		// If any traits could be gathered...
		if (_traits.size > 0) {
			const evaluation = this.traits.evaluate(_traits);
			return evaluation;
		}
		return false;
	}
}
