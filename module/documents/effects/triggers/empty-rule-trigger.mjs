import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';

/**
 * @desc Initial rule trigger.
 */
export class EmptyRuleTrigger extends RuleTriggerDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'emptyRuleTrigger' });
	}

	/**
	 * @return {String}
	 */
	static get localization() {
		return '-';
	}

	/**
	 * @return {String}
	 */
	static get template() {
		return systemTemplatePath('common/empty');
	}
}
