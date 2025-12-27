import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<CheckType>} checkTypes
 * @property {Set<FUItemGroup>} itemGroups
 * @property {Boolean} local Whether the trigger is restricted to the item the RE is attached to.
 * @extends RuleTriggerDataModel
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
			itemGroups: new fields.SetField(new fields.StringField()),
			local: new fields.BooleanField({ initial: true }),
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
		const checkType = context.event.config.check.type;

		if (this.itemGroups.size > 0) {
			if (!this.itemGroups.has(context.event.itemGroup)) {
				return false;
			}
		}

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
				if (this.local && context.item) {
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
