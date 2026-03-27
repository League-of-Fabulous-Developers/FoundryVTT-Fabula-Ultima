import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FU } from '../../../helpers/config.mjs';

const fields = foundry.data.fields;

/**
 * @property {UserDefinedType} dataType
 * @property {String} payload JSON
 */
export class RegisterTypeRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'registerTypeRuleAction' });
	}

	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.PREPARE_DATA_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			dataType: new fields.StringField({ initial: '', blank: true, choices: Object.keys(FU.userDefinedTypes) }),
			payload: new fields.JSONField({ initial: '{}', blank: true }),
		});
	}

	static get localization() {
		return 'FU.RuleActionRegisterType';
	}

	static get template() {
		return systemTemplatePath('effects/actions/register-type-rule-action');
	}

	get dataTypeTemplate() {
		return systemTemplatePath('effects/actions/register-type-rule-action-template');
	}

	/**
	 * @param {RuleElementContext<PrepareDataEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		if (context.event.data && this.payload) {
			// Validate payload?

			context.event.data.push(this.payload);
		}
	}
}
