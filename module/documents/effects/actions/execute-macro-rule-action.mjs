import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;
const documents = foundry.documents;

/**
 * @property {documents.Macro} macro
 */
export class ExecuteMacroRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'executeMacroRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			macro: new fields.ForeignDocumentField(documents.Macro),
		});
	}

	static get localization() {
		return 'FU.RuleActionExecuteMacro';
	}

	static get template() {
		return systemTemplatePath('effects/actions/execute-macro-rule-action');
	}

	async execute(context, selected) {
		if (this.macro) {
			this.macro.execute({
				actor: context.source.actor,
				token: context.source.token,
				context: context,
				selected: selected,
			});
		}
	}
}
