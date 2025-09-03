import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUSpeciesKey} species
 */
export class SpeciesRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'speciesRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			species: new fields.StringField({ initial: 'beast', choices: Object.keys(FU.species) }),
		});
	}

	static migrateData(source) {
		if (source.species.value) {
			source.species = 'beast';
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
		for (const target of context.targets) {
			if (target.actor.type === 'npc') {
				if (target.actor.system.species.value === this.species) {
					return true;
				}
			}
		}
		return false;
	}
}
