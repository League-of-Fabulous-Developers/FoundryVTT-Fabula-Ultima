import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { Effects } from '../../../pipelines/effects.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { InlineSourceInfo } from '../../../helpers/inline-helper.mjs';
import { Flags } from '../../../helpers/flags.mjs';
import { Pipeline } from '../../../pipelines/pipeline.mjs';
import { ChatSectionOrder } from '../../../checks/default-section-order.mjs';
import { Targeting } from '../../../helpers/targeting.mjs';

const fields = foundry.data.fields;

/**
 * @property {String} effect The uuid of the effect
 */
export class ApplyEffectRuleAction extends RuleActionDataModel {
	static defineSchema() {
		return {
			effect: new fields.StringField({ nullable: true }),
		};
	}

	static get localization() {
		return 'FU.RuleActionApplyEffect';
	}

	static get template() {
		return systemTemplatePath('effects/actions/apply-effect-rule-action');
	}

	async execute(context, selected) {
		if (!this.effect) {
			return;
		}
		const effectData = await Effects.getEffectData(this.effect);
		if (!effectData) {
			return;
		}

		if (context.data.config) {
			/** @type CheckConfigurer **/
			const config = context.data.config;
			config.addEffects(this.effect);
		} else if (context.data.renderData && context.source) {
			const renderData = context.data.renderData;
			// Flag information
			let sourceInfo;
			const item = context.getItem();
			if (item) {
				sourceInfo = new InlineSourceInfo(item.name, context.source ? context.source.actor.uuid : null, item.uuid);
			} else {
				sourceInfo = context.sourceInfo;
			}

			if (!renderData.flags) {
				renderData.flags = [];
			}
			renderData.flags = Pipeline.setFlag(renderData.flags, Flags.ChatMessage.Targets, true);
			renderData.flags = Pipeline.setFlag(renderData.flags, Flags.ChatMessage.Effects, true);

			const targets = selected.map((c) => c.actor);
			const targetData = Targeting.serializeTargetData(targets);

			let actions = [];
			actions.push(Targeting.defaultAction);
			actions.push(await Effects.getTargetedAction(this.effect, sourceInfo));
			actions = actions.filter((a) => a !== null);

			renderData.sections.push(async () => ({
				order: ChatSectionOrder.actions,
				partial: 'systems/projectfu/templates/chat/partials/chat-actions.hbs',
				data: {
					targets: targetData,
					actions: actions,
				},
			}));
		} else {
			const targets = selected.map((c) => c.actor);
			await Effects.promptApplyEffect(context.character.actor, targets, [this.effect], context.sourceInfo);
		}
	}
}
