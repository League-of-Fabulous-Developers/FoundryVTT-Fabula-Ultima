import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<FUAdversaryRank>} ranks
 */
export class RankRulePredicate extends RulePredicateDataModel {
	static defineSchema() {
		return {
			ranks: new fields.SetField(new fields.StringField()),
			quantifier: new fields.StringField({
				initial: 'all',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
		};
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
		if (context.character.actor.type !== 'character') return true;
		if (this.ranks.size === 0) return true;

		switch (this.quantifier) {
			case 'all':
				return context.targets.every((character) => this.#hasMatchingRank(character.actor));

			case 'any':
				return context.targets.some((character) => this.#hasMatchingRank(character.actor));

			case 'none':
				return context.targets.every((character) => !this.#hasMatchingRank(character.actor));
		}
		return true;
	}

	#hasMatchingRank(actor) {
		return this.ranks.has(actor.system.rank.value);
	}
}
