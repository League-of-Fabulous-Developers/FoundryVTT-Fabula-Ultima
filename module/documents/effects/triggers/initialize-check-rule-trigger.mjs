import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {Set<CheckType>} checkTypes
 * @property {Set<FUItemGroup>} itemGroups
 * @property {Boolean} local Whether the trigger is restricted to the item the RE is attached to.
 * @extends RuleTriggerDataModel
 * @inheritDoc
 */
export class InitializeCheckRuleTrigger extends RuleTriggerDataModel {
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			checkTypes: new fields.SetField(new fields.StringField({ choices: Object.keys(FU.checkTypes) })),
			itemGroups: new fields.SetField(new fields.StringField({ choices: Object.keys(FU.itemGroup) })),
			local: new fields.BooleanField({ initial: false }),
		});
	}

	/**
	 * @inheritDoc
	 */
	static get eventType() {
		return FUHooks.INITIALIZE_CHECK_EVENT;
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
		if (this.itemGroups.size > 0) {
			if (!this.itemGroups.has(context.event.itemGroup)) {
				return false;
			}
		}

		// Validate check types
		/** @type {CheckType} **/
		const checkType = context.event.config.check.type;
		if (this.checkTypes.size > 0 && !this.checkTypes.has(checkType)) {
			return false;
		}

		// If this RE is on an item, and it doesn't match the item in the event.
		if (this.local) {
			if (!context.isLocalItem()) {
				return false;
			}
		}

		return true;
	}
}
