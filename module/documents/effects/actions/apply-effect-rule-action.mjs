import { systemTemplatePath } from '../../../helpers/system-utils.mjs';
import { Effects } from '../../../pipelines/effects.mjs';
import { RuleActionDataModel } from './rule-action-data-model.mjs';
import { FUHooks } from '../../../hooks.mjs';

const fields = foundry.data.fields;
//const { DocumentUUIDField } =

/**
 * @property {String} effect The uuid of the effect
 */
export class ApplyEffectRuleAction extends RuleActionDataModel {
	static {
		Object.defineProperty(this, 'TYPE', { value: 'applyEffectRuleAction' });
	}

	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			effect: new fields.StringField({ nullable: true }),
			//effect: new DocumentUUIDField({ nullable: true, fieldType: 'ActiveEffect' }),
		});
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

		if (context.type === FUHooks.INITIALIZE_CHECK_EVENT) {
			/** @type InitializeCheckEvent **/
			const ice = context.event;
			const targetAction = Effects.getTargetedAction(this.effect, context.sourceInfo);
			ice.configuration.addTargetedAction(targetAction);
		} else {
			for (const sel of selected) {
				const instancedEffect = await Effects.instantiateEffect(this.effect);
				if (!instancedEffect) {
					return;
				}
				await Effects.promptApplyEffect(sel.actor, [instancedEffect], context.sourceInfo);
			}
		}
	}
}
