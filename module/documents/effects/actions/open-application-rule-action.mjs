import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { ApplicationPipeline } from '../../../pipelines/application-pipeline.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} application The internal identifier for the application.
 */
export class OpenApplicationRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'openApplicationRuleAction' });
	}

	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.RENDER_CHECK_EVENT, FUHooks.ITEM_ROLL_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			application: new fields.StringField(),
		});
	}

	static get localization() {
		return 'FU.RuleActionOpenApplication';
	}

	static get template() {
		return systemTemplatePath('effects/actions/open-application-rule-action');
	}

	async execute(context, selected) {
		if (!this.application) {
			return;
		}

		switch (context.eventType) {
			case FUHooks.RENDER_CHECK_EVENT: {
				const action = ApplicationPipeline.getChatAction(context.character.actor, context.item, this.application);
				if (action) {
					context.config.addTargetedAction(action);
				}
				break;
			}

			case FUHooks.ITEM_ROLL_EVENT: {
				/** @type ItemRollConfiguration **/
				const config = context.event.config;
				config.setOverride(ApplicationPipeline.getAction(context.character.actor, context.item, this.application));
				break;
			}
		}
	}
}
