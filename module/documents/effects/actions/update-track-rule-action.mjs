import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { ExpressionContext, Expressions } from '../../../expressions/expressions.mjs';
import { FU } from '../../../helpers/config.mjs';
import { ProgressPipeline } from '../../../pipelines/progress-pipeline.mjs';
import { FUHooks } from '../../../hooks.mjs';
import { FUChatBuilder } from '../../../helpers/chat-builder.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';

const fields = foundry.data.fields;
/**
 * @property {FUCommandAction} action
 * @property {String} identifier
 * @property {String} amount
 * @property {Boolean} notify
 */
export class UpdateTrackRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			action: new fields.StringField({
				initial: 'update',
				choices: Object.keys(FU.commandAction),
				required: true,
			}),
			identifier: new fields.StringField(),
			notify: new fields.BooleanField(),
			amount: new fields.StringField({ blank: true }),
		};
	}

	static get localization() {
		return 'FU.RuleActionUpdateTrack';
	}

	static get template() {
		return systemTemplatePath('effects/actions/update-track-rule-action');
	}

	async execute(context, selected) {
		for (const character of selected) {
			const actor = character.actor;
			let id = this.identifier || context.effect.system.rules.progress.id;
			let step;
			const progress = await actor.resolveProgress(id);
			if (!progress) return;

			switch (this.action) {
				case 'update': {
					const targets = selected.map((t) => t.actor);
					const expressionContext = ExpressionContext.fromSourceInfo(context.sourceInfo, targets);
					step = await Expressions.evaluateAsync(this.amount, expressionContext);
					break;
				}
				case 'reset':
					step = -progress.current;
					break;
			}

			if (step === 0) {
				return;
			}

			switch (context.eventType) {
				case FUHooks.RENDER_CHECK_EVENT: {
					/** @type CheckConfigurer **/
					const config = context.event.config;
					const action = ProgressPipeline.getAdvanceTargetedAction(actor, id, step, context.label);
					config.addTargetedAction(action);
					break;
				}
				default: {
					const chatBuilder = new FUChatBuilder(actor, null);
					let flags = {};
					CommonSections.chatActions(chatBuilder.renderData.sections, [ProgressPipeline.getAdvanceTargetedAction(actor, id, step, context.label)], flags);
					chatBuilder.withFlags(flags);
					await chatBuilder.create();
					break;
				}
			}
		}
	}
}
