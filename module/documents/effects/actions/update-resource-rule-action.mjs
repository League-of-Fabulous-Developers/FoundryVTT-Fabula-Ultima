import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { ResourcePipeline, ResourceRequest } from '../../../pipelines/resource-pipeline.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { SETTINGS } from '../../../settings.js';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;
/**
 * @property {FU.resources} resource
 * @property {String} amount
 */
export class UpdateResourceRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'updateResourceRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			amount: new fields.StringField({ blank: true }),
			resource: new fields.StringField({
				initial: 'hp',
				choices: Object.keys(FU.resources),
				required: true,
			}),
		});
	}

	static get localization() {
		return 'FU.RuleActionUpdateResource';
	}

	static get template() {
		return systemTemplatePath('effects/actions/update-resource-rule-action');
	}

	async execute(context, selected) {
		const targets = selected.map((t) => t.actor);
		const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
		if (context.check) {
			expressionContext.withCheck(context.check);
		}
		const amount = await Expressions.evaluateAsync(this.amount, expressionContext);
		if (amount === 0) {
			return;
		}
		const request = new ResourceRequest(context.sourceInfo, targets, this.resource, amount);
		request.fromOrigin(context.origin);

		if (context.eventType === FUHooks.INITIALIZE_CHECK_EVENT) {
			/** @type InitializeCheckEvent **/
			const ice = context.event;
			const targetAction = ResourcePipeline.getTargetedAction(request);
			ice.config.addTargetedAction(targetAction);
		} else {
			if (game.settings.get(SYSTEM, SETTINGS.automationUpdateResource)) {
				await ResourcePipeline.process(request);
			} else {
				await ResourcePipeline.prompt(request);
			}
		}
	}
}
