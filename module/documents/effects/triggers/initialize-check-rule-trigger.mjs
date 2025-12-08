import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {String} identifier The id of the item
 * @inheritDoc
 */
export class InitializeCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.INITIALIZE_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'initializeCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			identifier: new fields.StringField(),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerInitializeCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/initialize-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<InitializeCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		switch (context.event.configuration.check.type) {
			case 'accuracy':
			case 'magic':
			case 'display': {
				if (context.item) {
					if (context.event.sourceInfo.itemUuid === context.sourceInfo.itemUuid) {
						return true;
					}
				}
			}
		}
		return false;
	}
}
