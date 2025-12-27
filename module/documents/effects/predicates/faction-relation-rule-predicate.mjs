import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUFactionRelationKey} relation
 * @property {Boolean} inclusive
 */
export class FactionRelationRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'factionRelationRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			relation: new fields.StringField({
				initial: 'enemy',
				choices: Object.keys(FU.factionRelation),
			}),
			inclusive: new fields.BooleanField(),
		});
	}

	static get localization() {
		return 'FU.RulePredicateFactionRelation';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/faction-relation-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		switch (this.relation) {
			case 'ally':
				if (context.targets.find((t) => this.inclusive === (t.actor === context.character.actor) && t.disposition === context.character.disposition) === undefined) {
					return false;
				}
				break;
			case 'enemy':
				if (context.targets.find((t) => this.inclusive === (t.actor === context.character.actor) && t.disposition !== context.character.disposition) === undefined) {
					return false;
				}
				break;
		}
		return true;
	}
}
