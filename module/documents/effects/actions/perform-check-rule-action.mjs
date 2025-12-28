import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { CheckPrompt } from '../../../checks/check-prompt.mjs';

const fields = foundry.data.fields;

/**
 * @description Opens a specific application.
 * @property {CheckType} check The check to make.
 * @property {ItemAttributesDataModel} attributes
 * @property
 */
export class PerformCheckRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'performCheckRuleAction' });
	}

	/** @inheritdoc */
	static get metadata() {
		return {
			...super.metadata,
			eventTypes: [FUHooks.RENDER_CHECK_EVENT],
		};
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			check: new fields.StringField({
				initial: '',
				blank: true,
				choices: Object.keys(FU.dialogCheckTypes),
			}),
			attributes: new fields.EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: '' }, secondary: { value: '' } } }),
		});
	}

	static get localization() {
		return 'FU.RuleActionPerformCheck';
	}

	static get template() {
		return systemTemplatePath('effects/actions/perform-check-rule-action');
	}

	/**
	 * @param {RuleElementContext<RenderCheckEvent>} context
	 * @param selected
	 * @returns {Promise<void>}
	 */
	async execute(context, selected) {
		let action;
		if (this.check) {
			switch (this.check) {
				case 'ritual':
					action = CheckPrompt.getRitualCheckAction(context.character.actor, context.item);
					break;

				case 'opposed':
					break;
			}
		}
		context.event.config.addTargetedAction(action);
	}
}
