import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<FUAdversaryRank>} ranks
 */
export class RankRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'rankRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			ranks: new fields.SetField(new fields.StringField()),
		});
	}

	static get localization() {
		return 'FU.RulePredicateRank';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/rank-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		for (const target of context.targets) {
			/** @type NpcDataModel **/
			const targetData = target.actor.system;
			if (!this.ranks.has(targetData.rank.value)) {
				return false;
			}
		}
		return true;
	}
}
