import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @inheritDoc
 * @property {Set<CheckType>} checkTypes
 */
export class PerformCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.PERFORM_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'performCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			checkTypes: new fields.SetField(new fields.StringField()),
		});
		return schema;
	}

	// TODO: Remove once design is finished
	static migrateData(source) {
		return super.migrateData(source);
	}

	static get localization() {
		return 'FU.RuleTriggerPerformCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/perform-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<PerformCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (!this.checkTypes.has(context.event.check.type)) {
			return false;
		}
		return true;
	}
}
