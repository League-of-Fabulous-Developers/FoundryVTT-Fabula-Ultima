import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleTriggerDataModel } from './rule-trigger-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;

/**
 * @extends RuleTriggerDataModel
 * @property {String} identifier The id of the item
 * @inheritDoc
 */
export class RenderCheckRuleTrigger extends RuleTriggerDataModel {
	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventType: FUHooks.RENDER_CHECK_EVENT,
		};
	}

	static {
		Object.defineProperty(this, 'TYPE', { value: 'renderCheckRuleTrigger' });
	}

	static defineSchema() {
		const schema = Object.assign(super.defineSchema(), {
			identifier: new fields.StringField(),
		});
		return schema;
	}

	static get localization() {
		return 'FU.RuleTriggerRenderCheck';
	}

	static get template() {
		return systemTemplatePath('effects/triggers/render-check-rule-trigger');
	}

	/**
	 * @param {RuleElementContext<PerformCheckEvent>} context
	 * @returns {boolean}
	 */
	validateContext(context) {
		return context.matchesItem(this.identifier);
	}
}
