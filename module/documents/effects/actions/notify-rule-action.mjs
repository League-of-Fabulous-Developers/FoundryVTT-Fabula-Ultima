import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';

/**
 * @description Sends a message to chat
 * @property {String} message
 */
export class NotifyRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'notifyRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {});
	}

	static get localization() {
		return 'FU.RuleActionNotify';
	}

	static get template() {
		return systemTemplatePath('effects/actions/notify-rule-action');
	}

	async execute(context, selected) {
		let id;
		if (context.item.system.fuid) {
			id = context.item.system.fuid;
		} else {
			id = context.label;
		}
		CommonEvents.notify(context.source, id, context.origin);
	}
}
