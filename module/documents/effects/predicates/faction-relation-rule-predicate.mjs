import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {FUFactionRelationKey} relation
 * @property {Boolean} inclusive
 */
export class FactionRelationRulePredicate extends RulePredicateDataModel {
	static defineSchema() {
		return {
			relation: new fields.StringField({
				initial: 'enemy',
				choices: Object.keys(FU.factionRelation),
			}),
			inclusive: new fields.BooleanField(),
		};
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
		const eventOrigin = context.source;
		const effectOrigin = context.character;

		if (eventOrigin.actor === effectOrigin.actor) {
			switch (this.relation) {
				case 'ally': {
					if (!context.targets.some((t) => t.disposition === eventOrigin.disposition && (this.inclusive || t.actor !== eventOrigin.actor))) {
						return false;
					}
					break;
				}
				case 'enemy': {
					if (!context.targets.some((t) => t.disposition !== eventOrigin.disposition && (this.inclusive || t.actor !== eventOrigin.actor))) {
						return false;
					}
					break;
				}
			}
		} else {
			switch (this.relation) {
				case 'ally': {
					if (eventOrigin.disposition !== effectOrigin.disposition) {
						return false;
					}
					break;
				}
				case 'enemy': {
					if (eventOrigin.disposition === effectOrigin.disposition) {
						return false;
					}
					break;
				}
			}
		}

		return true;
	}
}
