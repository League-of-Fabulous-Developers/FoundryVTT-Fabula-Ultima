import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<DamageType>} species
 */
export class SpeciesRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'speciesRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			selector: new fields.StringField({
				initial: 'initial',
				blank: true,
				choices: Object.keys(FU.targetSelector),
			}),
			species: new fields.SetField(new fields.StringField()),
		});
	}

	static migrateData(source) {
		if (source.species.value) {
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
		const selected = context.selectTargets(this.selector);
		for (const character of selected) {
			if (character.actor.type === 'npc') {
				const npcSpecies = character.actor.system.species.value;
				if (this.species.has(npcSpecies)) {
					return true;
				}
			}
		}
		return false;
	}
}
