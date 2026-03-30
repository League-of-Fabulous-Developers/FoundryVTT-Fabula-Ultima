import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @description Trigger based when the active effect is enabled or disabled
 * @property {UserDefinedType} dataType
 */
export class PrepareDataRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.PREPARE_DATA_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'prepareDataRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			dataType: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.userDefinedTypes) }),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerPrepareData';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/prepare-data-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<PrepareDataEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		if (context.event.type !== this.dataType) {
			return false;
		}
		return true;
	}
}
