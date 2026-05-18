import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ItemAttributesDataModel } from '../../items/common/item-attributes-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { OpposedCheck } from '../../../checks/opposed-check.mjs';
import { GroupCheck } from '../../../checks/group-check.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';

const fields = foundry.data.fields;

/**
 * @description Opens a specific application.
 * @property {CheckType} check The check to make.
 * @property {ItemAttributesDataModel} attributes
 * @property {String} bonus A bonus to the check.
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
			bonus: new fields.StringField(),
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

		/** @type CheckConfig **/
		let config = {
			primary: this.attributes.primary.value,
			secondary: this.attributes.secondary.value,
			modifier: 0,
		};

		if (this.bonus) {
			const expressionContext = ExpressionContext.fromSourceInfo(
				context.sourceInfo,
				selected.map((s) => s.actor),
			);
			config.modifier = await Expressions.evaluateAsync(this.bonus, expressionContext);
		}

		if (this.check) {
			switch (this.check) {
				case 'ritual':
					action = GroupCheck.getRitualAction(context.character.actor, context.item, config);
					break;

				case 'opposed':
					action = OpposedCheck.getAction(context.character.actor, context.item, config);
					break;
			}
		}
		if (action) {
			context.event.config.addTargetedAction(action);
		}
	}
}
