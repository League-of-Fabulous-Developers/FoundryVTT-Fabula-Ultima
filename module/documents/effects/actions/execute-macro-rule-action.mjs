import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';

const fields = foundry.data.fields;
const Macro = foundry.documents.Macro;

/**
 * @property {documents.Macro} macro
 */
export class ExecuteMacroRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			macro: new fields.ForeignDocumentField(Macro),
		};
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
				actor: context?.source?.actor ?? null,
				token: context?.source?.token ?? null,
				context: context,
				selected: selected,
			});
		}
	}
}
