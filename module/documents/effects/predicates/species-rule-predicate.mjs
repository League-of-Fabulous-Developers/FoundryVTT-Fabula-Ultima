import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<DamageType>} species
 */
export class SpeciesRulePredicate extends RulePredicateDataModel {
	static defineSchema() {
		return {
			selector: new fields.StringField({
				initial: 'initial',
				blank: true,
				choices: Object.keys(FU.targetSelector),
			}),
			species: new fields.SetField(new fields.StringField()),
			quantifier: new fields.StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
		};
	}

	static migrateData(source) {
		if (source.species?.value) {
			source.species = [source.species.value];
		}
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RulePredicateSpecies';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/species-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		if (this.species.size === 0) return true;

		const selected = context.selectTargets(this.selector);
		switch (this.quantifier) {
			case 'all':
				return selected.every((character) => this.#hasMatchingSpecies(character.actor));

			case 'any':
				return selected.length === 0 || selected.some((character) => this.#hasMatchingSpecies(character.actor));

			case 'none':
				return selected.every((character) => !this.#hasMatchingSpecies(character.actor));
		}
		return false;
	}

	#hasMatchingSpecies(actor) {
		if (actor.type === 'npc') {
			return this.species.has(actor.system.species.value);
		}
		return true;
	}
}
