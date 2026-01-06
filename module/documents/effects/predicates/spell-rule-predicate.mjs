import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { SpellDataModel } from '../../items/spell/spell-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RulePredicateDataModel
 * @inheritDoc
 * @property {Boolean} offensive
 * @property {FUDurationType} duration
 */
export class SpellRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'spellRulePredicate' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			offensive: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.booleanOption) }),
			duration: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.duration) }),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RulePredicateSpell';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/spell-rule-predicate');
	}

	/**
	 * @param {RuleElementContext<SpellEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (!context.item) {
			return false;
		}

		// Resolve the item among events...
		let item;
		if (context.type === FUHooks.CALCULATE_DAMAGE_EVENT) {
			item = context.event.item;
		}

		if (!item) {
			return false;
		}
		if (!(item.system instanceof SpellDataModel)) {
			return false;
		}

		/** @type SpellDataModel **/
		const spell = item.system;
		if (this.offensive) {
			if (!spell.isOffensive.value) {
				// Check if the config has damage data...
				if (!context.config || !context.config.hasDamage) {
					return false;
				}
			}
		}
		if (this.duration && this.duration !== spell.duration.value) {
			return false;
		}
		return true;
	}
}
