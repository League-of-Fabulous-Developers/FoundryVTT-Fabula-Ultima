import { FU } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { ComparisonOperations } from '../../../helpers/comparison-operations.mjs';

const fields = foundry.data.fields;

/**
 *
 */
export class ProgressTrackRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.PROGRESS_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'progressTrackRuleTrigger' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			value: new fields.NumberField(),
			identifier: new fields.StringField({ initial: '' }),
			local: new fields.BooleanField({ initial: false }),
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

	static get localization() {
		return 'FU.RuleTriggerProgressTrack';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/progress-track-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<EffectToggledEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.origin === context.event.origin) return false;
		// Only trigger if the progress track is within the same item as this rule element
		if (this.local && context.source !== context.item) return;

		if (!this.comparisonOperator) return false;

		const event = context.event;
		const progress = event.progress;

		// Use resolveProgress here to allow for its logic, rather than
		// reimplementing it here
		const actorProgress = context.character?.actor?.resolveProgress(this.identifier);
		if (actorProgress !== progress) return false;

		if (this.comparisonOperator === 'max') {
			return progress.current >= progress.max;
		}

		if (!Number.isInteger(this.value)) {
			return false;
		}

		const comparisonOperation = ComparisonOperations[this.comparisonOperator];
		return comparisonOperation(progress.current, this.value);
	}
}
