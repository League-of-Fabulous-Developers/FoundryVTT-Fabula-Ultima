import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';
import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { SpellDataModel } from '../../items/spell/spell-data-model.mjs';

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
		if (!(context.item.system instanceof SpellDataModel)) {
			return false;
		}
		/** @type SpellDataModel **/
		const spell = context.item.system;
		if (this.offensive && !spell.isOffensive.value) {
			return false;
		}
		if (this.duration && !spell.duration.value !== this.duration) {
			return false;
		}
		return true;
	}
}
