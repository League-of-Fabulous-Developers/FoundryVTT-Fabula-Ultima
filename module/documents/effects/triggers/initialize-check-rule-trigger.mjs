import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {Set<CheckType>} checkTypes
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
			checkTypes: new fields.SetField(new fields.StringField()),
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
		/** @type {CheckType} **/
		const checkType = context.event.configuration.check.type;

		// Support only specific check types
		switch (checkType) {
			case 'accuracy':
			case 'magic':
			case 'display': {
				// If we are filtering by check types, and it's not there.
				if (this.checkTypes.size > 0 && !this.checkTypes.has(checkType)) {
					return false;
				}
				// If this RE is on an item, and it doesn't match the item in the event.
				if (context.item) {
					if (context.event.sourceInfo.itemUuid === context.sourceInfo.itemUuid) {
						return true;
					}
				}
				// If not on an item, will apply to all items
				else {
					return true;
				}
			}
		}
		return false;
	}
}
