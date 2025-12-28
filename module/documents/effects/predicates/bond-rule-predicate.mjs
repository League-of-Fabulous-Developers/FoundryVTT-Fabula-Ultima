import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUBondPredicateKey} bond
 */
export class BondRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'bondRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			bond: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.bondPredicate),
			}),
		});
	}

	static migrateData(source) {
		if (source.bond === 'any') {
			source.bond = '';
		}
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RulePredicateBond';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/bond-rule-predicate');
	}

	/**
	 * @override
	 */
	validateContext(context) {
		if (context.character.actor.type !== 'character') {
			return false;
		}
		/** @type BondDataModel[] **/
		const bonds = context.character.actor.system.bonds;
		for (const target of context.targets) {
			const bondsOnTarget = bonds.filter((bond) => bond.name === target.actor.name);
			if (bondsOnTarget.length === 0) {
				continue;
			}
			// If no particular bond is selected
			if (!this.bond) {
				return true;
			} else {
				for (const bond of bondsOnTarget) {
					if (bond.matches(this.bond)) {
						return true;
					}
				}
			}
		}
		return false;
	}
}
