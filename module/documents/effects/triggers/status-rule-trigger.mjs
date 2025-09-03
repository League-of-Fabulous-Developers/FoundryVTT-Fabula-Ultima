import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based when a status event is enabled/disabled
 * @property {String} status (dazed,crisis,etc...)
 * @property {String} change
 */
export class StatusRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.STATUS_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'statusRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			status: new fields.StringField({
				initial: 'crisis',
				choices: Object.keys(FU.statusEffects),
			}),
			change: new fields.StringField({
				initial: 'added',
				choices: Object.keys(FU.collectionChange),
			}),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerStatus';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/status-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<StatusEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (this.status !== context.event.status) {
			return false;
		}
		if (this.change === 'added') {
			return context.event.enabled === true;
		} else if (this.change === 'removed') {
			return context.event.enabled === false;
		}
		return true;
	}
}
