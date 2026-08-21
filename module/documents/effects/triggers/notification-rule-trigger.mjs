import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const { StringField } = foundry.data.fields;

/**
 * @description Trigger based on a combat event
 * @property {String} eventId
 */
export class NotificationRuleTrigger extends RuleTriggerDataModel {
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			eventId: new StringField(),
		});
	}

	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.NOTIFICATION_EVENT;
	}

	static get localization() {
		return 'FU.RuleTriggerNotify';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/notification-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<NotificationEvent>} context
	 */
	validateContext(context) {
		if (context.event.origin === context.origin) {
			return false;
		}
		return context.event.id === this.eventId;
	}
}
