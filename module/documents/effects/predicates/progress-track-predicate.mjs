import { RulePredicateDataModel } from './rule-predicate-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

export class ProgressTrackRulePredicate extends RulePredicateDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'progressTrackRulePredicate' });
	}
	static get localization() {
		return 'FU.RulePredicateProgressTrack';
	}

	static get template() {
		return systemTemplatePath('effects/predicates/progress-track-rule-predicate');
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			value: new fields.NumberField({ blank: true }),
			identifier: new fields.StringField({ initial: '' }),
			comparisonOperator: new fields.StringField({
				initial: '',
				blank: true,
				choices: {
					max: 'FU.Max',
					...FU.comparisonOperator,
				},
			}),
		});
	}

	/**
	 * @override
	 */
	validateContext(context) {
		if (context.origin === context.event.origin) return false;

		if (!context.character) {
			console.warn('Attempting to execute progress track predicate with no character.  Context:', context);
			return false;
		}

		const progress = context.character.actor.resolveProgress(this.identifier);
		if (!progress) return false;

		switch (this.comparisonOperator) {
			case 'max':
				return progress.current >= progress.max;
			case 'greaterThan':
				return progress.current > this.value;
			case 'lessThan':
				return progress.current < this.value;
			case 'equals':
				return progress.current === this.value;
		}

		return false;
	}
}
