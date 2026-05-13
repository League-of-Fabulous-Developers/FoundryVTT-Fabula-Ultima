// import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
// import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
// import { FUHooks } from '../../../hooks.mjs';

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

		if (!this.comparisonOperator) return false;

		const event = context.event;
		const progress = event.progress;

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
