import { FU } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';

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
		const schema = Object.assign(super.defineSchema(), {
			value: new fields.NumberField({ blank: true }),
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

		return schema;
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

		if (progress.id !== this.identifier && progress.name !== this.identifier) return;

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
