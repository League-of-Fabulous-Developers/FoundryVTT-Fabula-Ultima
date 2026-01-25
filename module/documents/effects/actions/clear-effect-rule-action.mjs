import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { Effects } from '../../../pipelines/effects.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} identifier The id of the effect to remove. If empty, it will clear all temporary effects.
 */
export class ClearEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'clearEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			identifier: new fields.StringField(),
		});
	}

	static get localization() {
		return 'FU.RuleActionClearEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/clear-effect-rule-action');
	}

	async execute(context, selected) {
		const action = await Effects.getClearAction(this.identifier, context.sourceInfo);
		context.config.addTargetedAction(action);
	}
}
