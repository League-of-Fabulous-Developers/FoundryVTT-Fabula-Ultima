import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} scope
 * @property {String} key
 * @property {String} value If set, will be evaluated as part of the predicate.
 * @property {FUTargetSelectorKey} selector
 * @property {FUPredicateQuantifier} quantifier
 */
export class FlagRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'flagRulePredicate' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			selector: new fields.StringField({
				initial: 'initial',
				blank: true,
				choices: Object.keys(FU.targetSelector),
			}),
			quantifier: new fields.StringField({
				initial: 'any',
				blank: true,
				choices: Object.keys(FU.predicateQuantifier),
			}),
			scope: new fields.StringField({
				initial: '',
			}),
			key: new fields.StringField({
				initial: '',
			}),
			value: new fields.StringField({
				initial: '',
			}),
		});
	}

	static get localization() {
		return 'FU.RulePredicateFlag';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/flag-rule-predicate');
	}

	/**
	 * @param {FUActor} actor
	 * @return {Boolean}
	 */
	matchesFlag(actor) {
		const actualValue = actor.getFlag(this.scope, this.key);
		if (actualValue === undefined) {
			return false;
		}
		if (this.value === undefined) {
			return true;
		}
		return this.value === actualValue;
	}

	validateContext(context) {
		const selected = context.selectTargets(this.selector);
		switch (this.quantifier) {
			case 'all':
				// All selected actors must have the flag
				return selected.every((character) => this.matchesFlag(character.actor));

			case 'any':
				// At least one actor must have the flag
				return selected.some((character) => this.matchesFlag(character.actor));

			case 'none':
				// No actor should have the flag
				return selected.every((character) => !this.matchesFlag(character.actor));
		}
		return false;
	}
}
