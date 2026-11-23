import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUBondEmotion} bond
 */
export class BondRulePredicate extends RulePredicateDataModel {
	static defineSchema() {
		return {
			bond: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.bondPredicate),
			}),
		};
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
		const eventOriginActor = context.source.actor;
		const effectOriginActor = context.character.actor;

		if (eventOriginActor.type === 'character') {
			const bonds = eventOriginActor.system.bonds;
			if (eventOriginActor === effectOriginActor) {
				for (const target of context.targets) {
					const bondsOnTarget = bonds.filter((bond) => bond.name === target.actor.name);
					if (bondsOnTarget.length === 0) {
						continue;
					}
					// If no particular bond is selected
					for (const bond of bondsOnTarget) {
						if (bond.matches(this.bond)) {
							return true;
						}
					}
				}
			} else {
				if (context.targets.some((value) => value.actor === effectOriginActor)) {
					if (bonds.some((value) => value.name === effectOriginActor.name)) {
						for (const bond of bonds) {
							if (bond.matches(this.bond)) {
								return true;
							}
						}
					}
				}
			}
		}

		if (effectOriginActor.type === 'character') {
			const bonds = effectOriginActor.system.bonds;
			if (bonds.some((value) => value.name === eventOriginActor.name)) {
				for (const bond of bonds) {
					if (bond.matches(this.bond)) {
						return true;
					}
				}
			}
		}

		return false;
	}
}
