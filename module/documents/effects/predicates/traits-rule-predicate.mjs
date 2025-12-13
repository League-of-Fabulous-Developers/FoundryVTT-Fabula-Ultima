import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { TraitsDataModel } from '../../items/common/traits-data-model.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';
import { Traits } from '../../../pipelines/traits.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @property {TraitsDataModel} traits
 */
export class TraitsRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'traitsRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			traits: new fields.EmbeddedDataField(TraitsDataModel, {
				options: FoundryUtils.getFormOptions(Traits, (k, v) => k),
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
		let _traits;

		if (context.type === FUHooks.CONSUMABLE_CREATE_EVENT) {
			/** @type CreateConsumableEvent **/
			const cre = context.event;
			_traits = cre.consumable.traits;
		}
		// If the event has an item reference, check it for traits
		else if (context.event.item?.traits) {
			_traits = context.event.item.traits;
		}

		// If any traits could be gathered...
		if (_traits) {
			return this.traits.evaluate(_traits);
		}
		return false;
	}
}
